/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { XYDataLayerConfig, XYPersistedState } from '@kbn/lens-common';
import type { AxisExtentConfig, YScaleType } from '@kbn/expression-xy-plugin/common';
import type { SavedObjectReference } from '@kbn/core/server';
import { capitalize } from 'lodash';
import type { XYState } from '../../../schema';
import type { DataSourceStateLayer } from '../../utils';
import { convertLegendToAPIFormat, convertLegendToStateFormat } from './legend';
import { buildXYLayer } from './state_layers';
import { getIdForLayer, isLensStateDataLayer } from './helpers';
import { nonNullable, isFormBasedLayer, isTextBasedLayer } from '../../utils';
import { getReversibleMappings, getScaleTypeFromColumnType } from '../utils';
import {
  buildAPIAnnotationsLayer,
  buildAPIDataLayer,
  buildAPIReferenceLinesLayer,
} from './api_layers';
import { stripUndefined } from '../utils';
import { axisLabelOrientationCompat } from '../common';
import { convertAppearanceToAPIFormat, convertAppearanceToStateFormat } from './appearances';
import type {
  LeftYAxisSchemaType,
  RightYAxisSchemaType,
  XAxisSchemaType,
  YScaleSchemaType,
} from '../../../schema/charts/xy';
import {
  DEFAULT_AXIS_GRID_VISIBLE,
  DEFAULT_AXIS_LABELS_ORIENTATION,
  DEFAULT_AXIS_TICKS_VISIBLE,
  DEFAULT_AXIS_TITLE_VISIBLE,
  DEFAULT_X_AXIS_DOMAIN,
  DEFAULT_Y_AXIS_DOMAIN,
} from './constants';
import type { XScaleSchemaType } from '../../../schema/charts/shared';

function convertFittingToStateFormat(fitting: XYState['fitting']) {
  return {
    ...(fitting?.type ? { fittingFunction: capitalize(fitting.type) } : {}),
    ...(fitting?.dotted ? { emphasizeFitting: fitting.dotted } : {}),
    ...(fitting?.end_value ? { endValue: capitalize(fitting.end_value) } : {}),
  };
}

type DomainType =
  | XAxisSchemaType['domain']
  | LeftYAxisSchemaType['domain']
  | RightYAxisSchemaType['domain'];

function convertAPIDomainToStateFormat(
  domain: DomainType,
  defaultConfig: NonNullable<DomainType>
): AxisExtentConfig | undefined {
  if (!domain) return;
  const domainRounding = { niceValues: domain.rounding ?? defaultConfig.rounding };
  switch (domain.type) {
    case 'full':
      return {
        mode: 'full',
        ...domainRounding,
      };
    case 'custom':
      return {
        mode: 'custom',
        lowerBound: domain.min,
        upperBound: domain.max,
        ...domainRounding,
      };
    case 'fit':
      return {
        mode: 'dataBounds',
        ...domainRounding,
      };
    default:
      return;
  }
}

function convertAxisSettingsToStateFormat(
  axis: XYState['axis']
): Pick<
  XYPersistedState,
  | 'xTitle'
  | 'yTitle'
  | 'yRightTitle'
  | 'yLeftScale'
  | 'yRightScale'
  | 'axisTitlesVisibilitySettings'
  | 'tickLabelsVisibilitySettings'
  | 'gridlinesVisibilitySettings'
  | 'xExtent'
  | 'yLeftExtent'
  | 'yRightExtent'
  | 'labelsOrientation'
> {
  const xAxis = axis?.x;
  const yLeftAxis = axis?.left;
  const yRightAxis = axis?.right;

  const xExtent = convertAPIDomainToStateFormat(xAxis?.domain, DEFAULT_X_AXIS_DOMAIN);
  const yLeftExtent = convertAPIDomainToStateFormat(yLeftAxis?.domain, DEFAULT_Y_AXIS_DOMAIN);
  const yRightExtent = convertAPIDomainToStateFormat(yRightAxis?.domain, DEFAULT_Y_AXIS_DOMAIN);
  const axisTitlesVisibilitySettings =
    xAxis?.title?.visible == null &&
    yLeftAxis?.title?.visible == null &&
    yRightAxis?.title?.visible == null
      ? undefined
      : {
          x: xAxis?.title?.visible ?? true,
          yLeft: yLeftAxis?.title?.visible ?? true,
          yRight: yRightAxis?.title?.visible ?? true,
        };
  const tickLabelsVisibilitySettings =
    xAxis?.ticks?.visible == null &&
    yLeftAxis?.ticks?.visible == null &&
    yRightAxis?.ticks?.visible == null
      ? undefined
      : {
          x: xAxis?.ticks?.visible ?? true,
          yLeft: yLeftAxis?.ticks?.visible ?? true,
          yRight: yRightAxis?.ticks?.visible ?? true,
        };
  const gridlinesVisibilitySettings =
    xAxis?.grid?.visible == null &&
    yLeftAxis?.grid?.visible == null &&
    yRightAxis?.grid?.visible == null
      ? undefined
      : {
          x: xAxis?.grid?.visible ?? true,
          yLeft: yLeftAxis?.grid?.visible ?? true,
          yRight: yRightAxis?.grid?.visible ?? true,
        };
  const labelsOrientation =
    xAxis?.labels?.orientation == null &&
    yLeftAxis?.labels?.orientation == null &&
    yRightAxis?.labels?.orientation == null
      ? undefined
      : {
          x: axisLabelOrientationCompat.toState(xAxis?.labels?.orientation ?? 'horizontal'),
          yLeft: axisLabelOrientationCompat.toState(yLeftAxis?.labels?.orientation ?? 'horizontal'),
          yRight: axisLabelOrientationCompat.toState(
            yRightAxis?.labels?.orientation ?? 'horizontal'
          ),
        };
  const xTitle = xAxis?.title?.text;
  const yTitle = yLeftAxis?.title?.text;
  const yRightTitle = yRightAxis?.title?.text;
  const yLeftScale = yLeftAxis?.scale;
  const yRightScale = yRightAxis?.scale;
  return stripUndefined({
    xTitle: xTitle && xTitle !== '' ? xTitle : undefined,
    yTitle: yTitle && yTitle !== '' ? yTitle : undefined,
    yRightTitle: yRightTitle && yRightTitle !== '' ? yRightTitle : undefined,
    yLeftScale,
    yRightScale,
    axisTitlesVisibilitySettings,
    tickLabelsVisibilitySettings,
    gridlinesVisibilitySettings,
    xExtent,
    yLeftExtent,
    yRightExtent,
    labelsOrientation,
  });
}

type LayerToDataView = Record<string, string>;

export function buildVisualizationState(
  config: XYState,
  usedDataViews: LayerToDataView,
  annotationGroupReferences: SavedObjectReference[]
): XYPersistedState {
  const layers = config.layers
    .map((layer, index) =>
      buildXYLayer(
        config,
        layer,
        index,
        usedDataViews[getIdForLayer(layer, index)],
        annotationGroupReferences
      )
    )
    .filter(nonNullable);
  return {
    preferredSeriesType: layers.filter(isLensStateDataLayer)[0]?.seriesType ?? 'bar_stacked',
    ...convertLegendToStateFormat(config.legend),
    ...convertFittingToStateFormat(config.fitting),
    ...convertAxisSettingsToStateFormat(config.axis),
    ...(config.decorations ? convertAppearanceToStateFormat(config.decorations) : {}),
    layers,
  };
}

export function buildVisualizationAPI(
  config: XYPersistedState,
  layers: Record<string, DataSourceStateLayer>,
  adHocDataViews: Record<string, unknown>,
  references: SavedObjectReference[],
  internalReferences: SavedObjectReference[]
): XYState {
  const dataLayers = config.layers.filter(isLensStateDataLayer);
  if (!dataLayers.length) {
    throw new Error('At least one data layer is required to build the XY API state');
  }
  if (dataLayers.every((layer) => layer.accessors.length === 0)) {
    throw new Error(
      'Data layers must have at least one accessor defined to build the XY API state'
    );
  }
  const decorations = convertAppearanceToAPIFormat(config);
  return {
    type: 'xy',
    ...convertLegendToAPIFormat(config.legend),
    ...convertFittingToAPIFormat(config),
    axis: convertAxisSettingsToAPIFormat(config, layers),
    ...(decorations ? { decorations } : {}),
    layers: buildXYLayerAPI(config, layers, adHocDataViews, references, internalReferences),
  };
}

function convertFittingToAPIFormat(config: XYPersistedState): Pick<XYState, 'fitting'> | {} {
  const fittingOptions = {
    ...(config.fittingFunction ? { type: config.fittingFunction.toLowerCase() } : {}),
    ...(config.emphasizeFitting ? { dotted: config.emphasizeFitting } : {}),
    ...(config.endValue ? { end_value: config.endValue.toLowerCase() } : {}),
  };

  if (Object.keys(fittingOptions).length === 0) {
    return {};
  }

  return { fitting: fittingOptions };
}

function convertDomainStateToAPIFormat(
  domain: AxisExtentConfig | undefined,
  defaultConfig: NonNullable<DomainType>
): NonNullable<DomainType> {
  if (domain) {
    if (domain.mode === 'full') {
      return {
        type: 'full',
        rounding: domain.niceValues ?? defaultConfig.rounding,
      };
    }
    if (domain.mode === 'custom') {
      if (domain.lowerBound == null || domain.upperBound == null) {
        return defaultConfig;
      }
      return {
        type: 'custom',
        min: domain.lowerBound,
        max: domain.upperBound,
        rounding: domain.niceValues ?? defaultConfig.rounding,
      };
    }
    if (domain.mode === 'dataBounds') {
      return {
        type: 'fit',
        rounding: domain.niceValues ?? defaultConfig.rounding,
      };
    }
  }
  return defaultConfig;
}

function convertXDomainStateToAPIFormat(
  axisExtent: AxisExtentConfig | undefined
): XAxisSchemaType['domain'] {
  const domain = convertDomainStateToAPIFormat(axisExtent, DEFAULT_X_AXIS_DOMAIN);
  // full domain is incompatible with X axis, only fit and custom are available
  return domain.type === 'full' ? DEFAULT_X_AXIS_DOMAIN : domain;
}

function convertYDomainStateToAPIFormat(
  axisExtent: AxisExtentConfig | undefined
): LeftYAxisSchemaType['domain'] | RightYAxisSchemaType['domain'] {
  return convertDomainStateToAPIFormat(axisExtent, DEFAULT_Y_AXIS_DOMAIN);
}

type YAccessorAnchorPositions = Map<string, 'left' | 'right'>;

export function getYAccessorsAxisPosition(
  layer: XYDataLayerConfig,
  accessorKey: (accessor: string) => string
): YAccessorAnchorPositions {
  const axisPositionPerAccessor: YAccessorAnchorPositions = new Map();
  // use left by default also if there is an issue with the YConfig and the axisMode is bottom.
  layer.accessors.forEach((accessor) => {
    const key = accessorKey(accessor);
    axisPositionPerAccessor.set(key, 'left');
  });
  // axisMode is configured within the `yConfig` property only
  // for metrics that where manually configured with a different axis position
  layer.yConfig?.forEach((yConfig) => {
    if (yConfig.axisMode === 'right') {
      const key = accessorKey(yConfig.forAccessor);
      axisPositionPerAccessor.set(key, 'right');
    }
  });
  return axisPositionPerAccessor;
}

function getYAccessorToAxisPositionMap(config: XYPersistedState): YAccessorAnchorPositions {
  const axisPositionPerAccessor: YAccessorAnchorPositions = new Map();
  config.layers.find((layer) => {
    const { layerId } = layer;
    if (isLensStateDataLayer(layer)) {
      const layerPositions = getYAccessorsAxisPosition(layer, (accessor) =>
        JSON.stringify([layerId, accessor])
      );
      layerPositions.forEach((value, key) => {
        axisPositionPerAccessor.set(key, value);
      });
    }
  });
  return axisPositionPerAccessor;
}

const yAxisScaleCompat = getReversibleMappings<YScaleSchemaType, YScaleType>([
  ['linear', 'linear'],
  ['log', 'log'],
  ['sqrt', 'sqrt'],
]);

function convertAxisSettingsToAPIFormat(
  config: XYPersistedState,
  layers: Record<string, DataSourceStateLayer>
): NonNullable<XYState['axis']> {
  let xAxisScale: XScaleSchemaType | undefined;
  const firstLayer = config.layers[0];
  const dataSourceLayer = layers[firstLayer.layerId];
  if (isTextBasedLayer(dataSourceLayer) && isLensStateDataLayer(firstLayer)) {
    const xColumn = dataSourceLayer.columns.find((c) => c.columnId === firstLayer.xAccessor);
    xAxisScale = getScaleTypeFromColumnType(xColumn?.meta?.type);
  }

  const xAxis = {
    type: 'x',
    title:
      config.xTitle || config.axisTitlesVisibilitySettings?.x != null
        ? stripUndefined({
            text: config.xTitle,
            visible:
              config.axisTitlesVisibilitySettings?.x != null
                ? config.axisTitlesVisibilitySettings.x
                : DEFAULT_AXIS_TITLE_VISIBLE,
          })
        : { visible: DEFAULT_AXIS_TITLE_VISIBLE },

    ticks:
      config.tickLabelsVisibilitySettings?.x != null
        ? { visible: config.tickLabelsVisibilitySettings.x }
        : { visible: DEFAULT_AXIS_TICKS_VISIBLE },
    grid:
      config.gridlinesVisibilitySettings?.x != null
        ? { visible: config.gridlinesVisibilitySettings.x }
        : { visible: DEFAULT_AXIS_GRID_VISIBLE },
    domain: convertXDomainStateToAPIFormat(config.xExtent),
    ...(config.labelsOrientation?.x != null
      ? {
          labels: {
            orientation: axisLabelOrientationCompat.toAPI(config.labelsOrientation.x),
          },
        }
      : {
          labels: {
            orientation: DEFAULT_AXIS_LABELS_ORIENTATION,
          },
        }),
    scale: xAxisScale,
  } satisfies XAxisSchemaType;

  const yAccessorToAxisPositionMap = getYAccessorToAxisPositionMap(config);
  const usedAxes = [...yAccessorToAxisPositionMap.values()];

  const leftAxis = {
    type: 'y',
    anchor: 'start',
    title:
      config.yTitle || config.axisTitlesVisibilitySettings?.yLeft != null
        ? stripUndefined({
            text: config.yTitle,
            visible:
              config.axisTitlesVisibilitySettings?.yLeft != null
                ? config.axisTitlesVisibilitySettings.yLeft
                : DEFAULT_AXIS_TITLE_VISIBLE,
          })
        : { visible: DEFAULT_AXIS_TITLE_VISIBLE },
    scale:
      config.yLeftScale && config.yLeftScale !== 'time'
        ? yAxisScaleCompat.toAPI(config.yLeftScale)
        : ('linear' as const), // default to linear
    ticks:
      config.tickLabelsVisibilitySettings?.yLeft != null
        ? { visible: config.tickLabelsVisibilitySettings.yLeft }
        : { visible: DEFAULT_AXIS_TICKS_VISIBLE },
    grid:
      config.gridlinesVisibilitySettings?.yLeft != null
        ? { visible: config.gridlinesVisibilitySettings.yLeft }
        : { visible: DEFAULT_AXIS_GRID_VISIBLE },
    domain: convertYDomainStateToAPIFormat(config.yLeftExtent),
    ...(config.labelsOrientation?.yLeft != null
      ? {
          labels: {
            orientation: axisLabelOrientationCompat.toAPI(config.labelsOrientation.yLeft),
          },
        }
      : { labels: { orientation: DEFAULT_AXIS_LABELS_ORIENTATION } }),
  } satisfies LeftYAxisSchemaType;

  const rightAxis = {
    type: 'y',
    anchor: 'end',
    title:
      config.yRightTitle || config.axisTitlesVisibilitySettings?.yRight != null
        ? stripUndefined({
            text: config.yRightTitle,
            visible:
              config.axisTitlesVisibilitySettings?.yRight != null
                ? config.axisTitlesVisibilitySettings.yRight
                : DEFAULT_AXIS_TITLE_VISIBLE,
          })
        : { visible: DEFAULT_AXIS_TITLE_VISIBLE },
    scale:
      config.yRightScale && config.yRightScale !== 'time'
        ? yAxisScaleCompat.toAPI(config.yRightScale)
        : ('linear' as YScaleSchemaType), // default to linear
    ticks:
      config.tickLabelsVisibilitySettings?.yRight != null
        ? { visible: config.tickLabelsVisibilitySettings.yRight }
        : { visible: DEFAULT_AXIS_TICKS_VISIBLE },
    grid:
      config.gridlinesVisibilitySettings?.yRight != null
        ? { visible: config.gridlinesVisibilitySettings.yRight }
        : { visible: DEFAULT_AXIS_GRID_VISIBLE },

    domain: convertYDomainStateToAPIFormat(config.yRightExtent),
    ...(config.labelsOrientation?.yRight != null
      ? {
          labels: {
            orientation: axisLabelOrientationCompat.toAPI(config.labelsOrientation.yRight),
          },
        }
      : { labels: { orientation: DEFAULT_AXIS_LABELS_ORIENTATION } }),
  } satisfies RightYAxisSchemaType;

  return {
    x: xAxis,
    ...(usedAxes.includes('left') ? { left: leftAxis } : {}),
    ...(usedAxes.includes('right') ? { right: rightAxis } : {}),
  };
}

function buildXYLayerAPI(
  visualization: XYPersistedState,
  layers: Record<string, DataSourceStateLayer>,
  adHocDataViews: Record<string, unknown>,
  references: SavedObjectReference[],
  adhocReferences?: SavedObjectReference[]
): XYState['layers'] {
  const apiLayers: XYState['layers'] = [];
  for (const visLayer of visualization.layers) {
    if (visLayer.layerType === 'referenceLine') {
      const datasourceLayer = layers[visLayer.layerId];
      if (isFormBasedLayer(datasourceLayer) || isTextBasedLayer(datasourceLayer)) {
        apiLayers.push(
          buildAPIReferenceLinesLayer(
            visLayer,
            datasourceLayer,
            adHocDataViews,
            references,
            adhocReferences
          )
        );
      }
    }
    if (isLensStateDataLayer(visLayer)) {
      const datasourceLayer = layers[visLayer.layerId];
      if (
        datasourceLayer &&
        (isFormBasedLayer(datasourceLayer) || isTextBasedLayer(datasourceLayer))
      ) {
        apiLayers.push(
          buildAPIDataLayer(visLayer, datasourceLayer, adHocDataViews, references, adhocReferences)
        );
      }
    }
    if (visLayer.layerType === 'annotations') {
      apiLayers.push(
        buildAPIAnnotationsLayer(visLayer, adHocDataViews, references, adhocReferences)
      );
    }
  }
  return apiLayers;
}
