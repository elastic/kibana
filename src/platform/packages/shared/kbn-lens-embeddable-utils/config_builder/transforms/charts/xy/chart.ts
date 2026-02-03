/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { XYState as XYLensState } from '@kbn/lens-common';
import type { AxisExtentConfig } from '@kbn/expression-xy-plugin/common';
import type { SavedObjectReference } from '@kbn/core/server';
import type { Writable } from '@kbn/utility-types';
import { capitalize } from 'lodash';
import type { XYState } from '../../../schema';
import type { DataSourceStateLayer } from '../../utils';
import { convertLegendToAPIFormat, convertLegendToStateFormat } from './legend';
import { buildXYLayer } from './state_layers';
import { getIdForLayer, isLensStateDataLayer } from './helpers';
import { nonNullable, isFormBasedLayer, isTextBasedLayer } from '../../utils';
import {
  buildAPIAnnotationsLayer,
  buildAPIDataLayer,
  buildAPIReferenceLinesLayer,
} from './api_layers';
import { stripUndefined } from '../utils';
import { convertAppearanceToAPIFormat, convertAppearanceToStateFormat } from './appearances';

function convertFittingToStateFormat(fitting: XYState['fitting']) {
  return {
    ...(fitting?.type ? { fittingFunction: capitalize(fitting.type) } : {}),
    ...(fitting?.dotted ? { emphasizeFitting: fitting.dotted } : {}),
    ...(fitting?.end_value ? { endValue: capitalize(fitting.end_value) } : {}),
  };
}

type AxisType = Required<NonNullable<XYState['axis']>>;
type XAxisType = AxisType extends { x?: infer T } ? T : undefined;
type YAxisType = AxisType extends { left?: infer L; right?: infer R } ? L | R : undefined;
type EditableAxisType = Writable<XYState['axis']>;
type ExtentsType = XAxisType['extent'] | YAxisType['extent'];

function convertAPIExtentToStateFormat(extent: ExtentsType): AxisExtentConfig | undefined {
  switch (extent?.type) {
    case 'full':
      return {
        mode: 'full',
        ...(extent.integer_rounding != null ? { niceValues: extent.integer_rounding } : {}),
      };
    case 'custom':
      return {
        mode: 'custom',
        lowerBound: extent.start,
        upperBound: extent.end,
        ...(extent.integer_rounding != null ? { niceValues: extent.integer_rounding } : {}),
      };
    case 'focus':
      return { mode: 'dataBounds' };
    default:
      return;
  }
}

const orientationDictionary = {
  horizontal: 0,
  vertical: -90,
  angled: -45,
} as const;

function convertAxisSettingsToStateFormat(
  axis: XYState['axis']
): Pick<
  XYLensState,
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
  const xExtent = convertAPIExtentToStateFormat(axis?.x?.extent);
  const yLeftExtent = convertAPIExtentToStateFormat(axis?.left?.extent);
  const yRightExtent = convertAPIExtentToStateFormat(axis?.right?.extent);
  const axisTitlesVisibilitySettings =
    axis?.x?.title?.visible == null &&
    axis?.left?.title?.visible == null &&
    axis?.right?.title?.visible == null
      ? undefined
      : {
          x: axis?.x?.title?.visible ?? true,
          yLeft: axis?.left?.title?.visible ?? true,
          yRight: axis?.right?.title?.visible ?? true,
        };
  const tickLabelsVisibilitySettings =
    axis?.x?.ticks == null && axis?.left?.ticks == null && axis?.right?.ticks == null
      ? undefined
      : {
          x: axis?.x?.ticks ?? true,
          yLeft: axis?.left?.ticks ?? true,
          yRight: axis?.right?.ticks ?? true,
        };
  const gridlinesVisibilitySettings =
    axis?.x?.grid == null && axis?.left?.grid == null && axis?.right?.grid == null
      ? undefined
      : {
          x: axis?.x?.grid ?? true,
          yLeft: axis?.left?.grid ?? true,
          yRight: axis?.right?.grid ?? true,
        };
  const labelsOrientation =
    axis?.x?.label_orientation == null &&
    axis?.left?.label_orientation == null &&
    axis?.right?.label_orientation == null
      ? undefined
      : {
          x: orientationDictionary[axis?.x?.label_orientation ?? 'horizontal'],
          yLeft: orientationDictionary[axis?.left?.label_orientation ?? 'horizontal'],
          yRight: orientationDictionary[axis?.right?.label_orientation ?? 'horizontal'],
        };
  const xTitle = axis?.x?.title?.value;
  const yTitle = axis?.left?.title?.value;
  const yRightTitle = axis?.right?.title?.value;
  const yLeftScale = axis?.left?.scale;
  const yRightScale = axis?.right?.scale;
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
  usedDataViews: LayerToDataView
): XYLensState {
  const layers = config.layers
    .map((layer, index) => buildXYLayer(layer, index, usedDataViews[getIdForLayer(layer, index)]))
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
  config: XYLensState,
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
    ...convertAxisSettingsToAPIFormat(config),
    ...(decorations ? { decorations } : {}),
    layers: buildXYLayerAPI(config, layers, adHocDataViews, references, internalReferences),
  };
}

function convertFittingToAPIFormat(config: XYLensState): Pick<XYState, 'fitting'> | {} {
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

function convertExtendsToAPIFormat(extent: AxisExtentConfig | undefined): { extent?: ExtentsType } {
  if (extent) {
    if (extent.mode === 'full') {
      return {
        extent: {
          type: 'full',
          ...(extent.niceValues != null ? { integer_rounding: extent.niceValues } : {}),
        },
      };
    }
    if (extent.mode === 'custom') {
      if (extent.lowerBound == null || extent.upperBound == null) {
        return {};
      }
      return {
        extent: {
          type: 'custom',
          start: extent.lowerBound,
          end: extent.upperBound,
          ...(extent.niceValues != null ? { integer_rounding: extent.niceValues } : {}),
        },
      };
    }
    if (extent.mode === 'dataBounds') {
      return { extent: { type: 'focus' } };
    }
  }
  return {};
}

function convertXExtent(extent: AxisExtentConfig | undefined): {
  extent?: Exclude<ExtentsType, { type: 'focus' }>;
} {
  const xExtent = convertExtendsToAPIFormat(extent);
  // focus mode is not compatible with X axis extent
  if (xExtent.extent?.type !== 'focus') {
    // for some reasons TS is not able to infer that here xExtent.extent can't be 'focus'
    // so we need to rewrap it to avoid explicit casting
    return { extent: xExtent.extent };
  }
  return {};
}

function convertAxisSettingsToAPIFormat(config: XYLensState): Pick<XYState, 'axis'> | {} {
  const axis: EditableAxisType = {};

  const xAxis: XAxisType = stripUndefined({
    title:
      config.xTitle || config.axisTitlesVisibilitySettings?.x != null
        ? stripUndefined({
            value: config.xTitle,
            visible:
              config.axisTitlesVisibilitySettings?.x != null
                ? config.axisTitlesVisibilitySettings.x
                : undefined,
          })
        : undefined,

    ticks:
      config.tickLabelsVisibilitySettings?.x != null
        ? config.tickLabelsVisibilitySettings.x
        : undefined,
    grid:
      config.gridlinesVisibilitySettings?.x != null
        ? config.gridlinesVisibilitySettings.x
        : undefined,
    ...convertXExtent(config.xExtent),
    label_orientation:
      config.labelsOrientation?.x != null
        ? (Object.entries(orientationDictionary).find(
            ([_, value]) => value === config.labelsOrientation?.x
          )?.[0] as 'horizontal' | 'vertical' | 'angled' | undefined)
        : undefined,
  });
  if (Object.keys(xAxis).length) {
    axis.x = xAxis;
  }

  const leftAxis = stripUndefined({
    title:
      config.yTitle || config.axisTitlesVisibilitySettings?.yLeft != null
        ? stripUndefined({
            value: config.yTitle,
            visible:
              config.axisTitlesVisibilitySettings?.yLeft != null
                ? config.axisTitlesVisibilitySettings.yLeft
                : undefined,
          })
        : undefined,
    scale: config.yLeftScale ? config.yLeftScale : undefined,
    ticks:
      config.tickLabelsVisibilitySettings?.yLeft != null
        ? config.tickLabelsVisibilitySettings.yLeft
        : undefined,
    grid:
      config.gridlinesVisibilitySettings?.yLeft != null
        ? config.gridlinesVisibilitySettings.yLeft
        : undefined,
    ...convertExtendsToAPIFormat(config.yLeftExtent),
    label_orientation:
      config.labelsOrientation?.yLeft != null
        ? (Object.entries(orientationDictionary).find(
            ([_, value]) => value === config.labelsOrientation?.yLeft
          )?.[0] as 'horizontal' | 'vertical' | 'angled' | undefined)
        : undefined,
  });
  if (Object.keys(leftAxis).length) {
    axis.left = leftAxis;
  }

  const rightAxis = stripUndefined({
    title:
      config.yRightTitle || config.axisTitlesVisibilitySettings?.yRight != null
        ? stripUndefined({
            value: config.yRightTitle,
            visible:
              config.axisTitlesVisibilitySettings?.yRight != null
                ? config.axisTitlesVisibilitySettings.yRight
                : undefined,
          })
        : undefined,
    scale: config.yRightScale ? config.yRightScale : undefined,
    ticks:
      config.tickLabelsVisibilitySettings?.yRight != null
        ? config.tickLabelsVisibilitySettings.yRight
        : undefined,
    grid:
      config.gridlinesVisibilitySettings?.yRight != null
        ? config.gridlinesVisibilitySettings.yRight
        : undefined,

    ...convertExtendsToAPIFormat(config.yRightExtent),
    label_orientation:
      config.labelsOrientation?.yRight != null
        ? (Object.entries(orientationDictionary).find(
            ([_, value]) => value === config.labelsOrientation?.yRight
          )?.[0] as 'horizontal' | 'vertical' | 'angled' | undefined)
        : undefined,
  });

  if (Object.keys(rightAxis).length) {
    axis.right = rightAxis;
  }

  if (['x', 'left', 'right'].every((dir) => !(dir in axis))) {
    return {};
  }

  return { axis };
}

function buildXYLayerAPI(
  visualization: XYLensState,
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
