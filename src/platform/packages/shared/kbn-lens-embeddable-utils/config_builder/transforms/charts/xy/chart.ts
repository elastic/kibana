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
import type { XYState } from '../../../schema';
import { convertLegendToAPIFormat, convertLegendToStateFormat } from './legend';
import { buildXYLayer } from './state_layers';
import { getIdForLayer, isFormBasedLayer, isLensStateDataLayer, isTextBasedLayer } from './helpers';
import type { DataSourceStateLayer } from '../../utils';
import { nonNullable } from '../../utils';
import {
  buildAPIAnnotationsLayer,
  buildAPIDataLayer,
  buildAPIReferenceLinesLayer,
} from './api_layers';

function convertFittingToStateFormat(fitting: XYState['fitting']) {
  return {
    ...(fitting?.type ? { fittingFunction: fitting?.type } : {}),
    ...(fitting?.dotted ? { emphasizeFitting: fitting?.dotted } : {}),
    ...(fitting?.endValue ? { endValue: fitting?.endValue } : {}),
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
  return {
    ...(xTitle && xTitle !== '' ? { xTitle } : {}),
    ...(yTitle && yTitle !== '' ? { yTitle } : {}),
    ...(yRightTitle && yRightTitle !== '' ? { yRightTitle } : {}),
    ...(yLeftScale ? { yLeftScale } : {}),
    ...(yRightScale ? { yRightScale } : {}),
    ...(axisTitlesVisibilitySettings ? { axisTitlesVisibilitySettings } : {}),
    ...(tickLabelsVisibilitySettings ? { tickLabelsVisibilitySettings } : {}),
    ...(gridlinesVisibilitySettings ? { gridlinesVisibilitySettings } : {}),
    ...(xExtent ? { xExtent } : {}),
    ...(yLeftExtent ? { yLeftExtent } : {}),
    ...(yRightExtent ? { yRightExtent } : {}),
    ...(labelsOrientation ? { labelsOrientation } : {}),
  };
}

const curveType = {
  linear: 'LINEAR',
  smooth: 'CURVE_MONOTONE_X',
  stepped: 'CURVE_STEP_AFTER',
} as const;

function convertAppearanceToStateFormat(
  config: XYState
): Pick<
  XYLensState,
  | 'valueLabels'
  | 'labelsOrientation'
  | 'curveType'
  | 'fillOpacity'
  | 'minBarHeight'
  | 'hideEndzones'
  | 'showCurrentTimeMarker'
  | 'pointVisibility'
> {
  return {
    ...(config.decorations?.value_labels != null
      ? { valueLabels: config.decorations?.value_labels ? 'show' : 'hide' }
      : {}),
    ...(config.decorations?.line_interpolation
      ? { curveType: curveType[config.decorations?.line_interpolation] }
      : {}),
    ...(config.decorations?.fill_opacity != null
      ? { fillOpacity: config.decorations?.fill_opacity }
      : {}),
    ...(config.decorations?.minimum_bar_height
      ? { minBarHeight: config.decorations?.minimum_bar_height }
      : {}),
  };
}

type LayerToDataView = Record<string, string>;

function buildLayers(layers: XYState['layers'], dataViews: LayerToDataView): XYLensState['layers'] {
  return layers
    .map((layer, index) => buildXYLayer(layer, index, dataViews[getIdForLayer(layer, index)]))
    .filter(nonNullable);
}

export function buildVisualizationState(
  config: XYState,
  usedDataViews: LayerToDataView
): XYLensState {
  const layers = buildLayers(config.layers, usedDataViews);
  return {
    preferredSeriesType: layers.filter(isLensStateDataLayer)[0]?.seriesType ?? 'bar_stacked',
    ...convertLegendToStateFormat(config.legend),
    ...convertFittingToStateFormat(config.fitting),
    ...convertAxisSettingsToStateFormat(config.axis),
    ...convertAppearanceToStateFormat(config),
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
  return {
    type: 'xy',
    ...convertLegendToAPIFormat(config.legend),
    ...convertFittingToAPIFormat(config),
    ...convertAxisSettingsToAPIFormat(config),
    ...convertAppearanceToAPIFormat(config),
    layers: buildXYLayerAPI(config, layers, adHocDataViews, references, internalReferences),
  };
}

function convertFittingToAPIFormat(config: XYLensState): Pick<XYState, 'fitting'> | {} {
  const fittingOptions = {
    ...(config.fittingFunction ? { type: config.fittingFunction } : {}),
    ...(config.emphasizeFitting ? { dotted: config.emphasizeFitting } : {}),
    ...(config.endValue ? { endValue: config.endValue } : {}),
  };

  if (Object.keys(fittingOptions).length === 0) {
    return {};
  }

  return { fitting: fittingOptions };
}

function convertExtendsToAPIFormat(
  extent: AxisExtentConfig | undefined
): { extent: ExtentsType } | {} {
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

function convertAxisSettingsToAPIFormat(config: XYLensState): Pick<XYState, 'axis'> | {} {
  const axis: EditableAxisType = {};

  const xAxis: XAxisType = {
    ...(config.xTitle
      ? {
          title: {
            value: config.xTitle,
            ...(config.axisTitlesVisibilitySettings?.x != null
              ? { visible: config.axisTitlesVisibilitySettings.x }
              : {}),
          },
        }
      : {}),
    ...(config.tickLabelsVisibilitySettings?.x != null
      ? { ticks: config.tickLabelsVisibilitySettings.x }
      : {}),
    ...(config.gridlinesVisibilitySettings?.x != null
      ? { grid: config.gridlinesVisibilitySettings.x }
      : {}),
    ...(convertExtendsToAPIFormat(config.xExtent) as { extent?: XAxisType['extent'] }),
    ...(config.labelsOrientation?.x != null
      ? {
          label_orientation: Object.entries(orientationDictionary).find(
            ([_, value]) => value === config.labelsOrientation?.x
          )?.[0] as 'horizontal' | 'vertical' | 'angled' | undefined,
        }
      : {}),
  };
  if (Object.keys(xAxis).length) {
    axis.x = xAxis;
  }

  const leftAxis = {
    ...(config.yTitle
      ? {
          title: {
            value: config.yTitle,
            ...(config.axisTitlesVisibilitySettings?.yLeft != null
              ? { visible: config.axisTitlesVisibilitySettings.yLeft }
              : {}),
          },
        }
      : {}),
    ...(config.yLeftScale ? { scale: config.yLeftScale } : {}),
    ...(config.tickLabelsVisibilitySettings?.yLeft != null
      ? { ticks: config.tickLabelsVisibilitySettings.yLeft }
      : {}),
    ...(config.gridlinesVisibilitySettings?.yLeft != null
      ? { grid: config.gridlinesVisibilitySettings.yLeft }
      : {}),
    ...(convertExtendsToAPIFormat(config.yLeftExtent) as { extent?: YAxisType['extent'] }),
    ...(config.labelsOrientation?.yLeft != null
      ? {
          label_orientation: Object.entries(orientationDictionary).find(
            ([_, value]) => value === config.labelsOrientation?.yLeft
          )?.[0] as 'horizontal' | 'vertical' | 'angled' | undefined,
        }
      : {}),
  };
  if (Object.keys(leftAxis).length) {
    axis.left = leftAxis;
  }

  const rightAxis = {
    ...(config.yRightTitle
      ? {
          title: {
            value: config.yRightTitle,
            ...(config.axisTitlesVisibilitySettings?.yRight != null
              ? { visible: config.axisTitlesVisibilitySettings.yRight }
              : {}),
          },
        }
      : {}),
    ...(config.yRightScale ? { scale: config.yRightScale } : {}),
    ...(config.tickLabelsVisibilitySettings?.yRight != null
      ? { ticks: config.tickLabelsVisibilitySettings.yRight }
      : {}),
    ...(config.gridlinesVisibilitySettings?.yRight != null
      ? { grid: config.gridlinesVisibilitySettings.yRight }
      : {}),
    ...(convertExtendsToAPIFormat(config.yRightExtent) as { extent?: YAxisType['extent'] }),
    ...(config.labelsOrientation?.yRight != null
      ? {
          label_orientation: Object.entries(orientationDictionary).find(
            ([_, value]) => value === config.labelsOrientation?.yRight
          )?.[0] as 'horizontal' | 'vertical' | 'angled' | undefined,
        }
      : {}),
  };

  if (Object.keys(rightAxis).length) {
    axis.right = rightAxis;
  }

  if (['x', 'left', 'right'].every((dir) => !(dir in axis))) {
    return {};
  }

  return { axis };
}

function convertAppearanceToAPIFormat(config: XYLensState): Pick<XYState, 'decorations'> | {} {
  const decorations: XYState['decorations'] = {
    ...(config.valueLabels != null ? { value_labels: config.valueLabels === 'show' } : {}),
    ...(config.curveType
      ? {
          line_interpolation: (Object.entries(curveType).find(
            ([_, value]) => value === config.curveType
          )?.[0] || 'linear') as 'linear' | 'smooth' | 'stepped',
        }
      : {}),
    ...(config.fillOpacity != null ? { fill_opacity: config.fillOpacity } : {}),
    ...(config.minBarHeight != null ? { minimum_bar_height: config.minBarHeight } : {}),
  };

  if (Object.keys(decorations).length === 0) {
    return {};
  }

  return { decorations };
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
