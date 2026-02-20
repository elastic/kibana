/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  FormBasedLayer,
  SeriesType,
  TextBasedLayer,
  XYAnnotationLayerConfig,
  XYDataLayerConfig,
  XYReferenceLineLayerConfig,
  YConfig,
} from '@kbn/lens-common';
import { AvailableReferenceLineIcons } from '@kbn/lens-common';
import type { SavedObjectReference } from '@kbn/core/server';
import type { AvailableReferenceLineIcon } from '@kbn/expression-xy-plugin/common';
import { isRangeAnnotationConfig, isQueryAnnotationConfig } from '@kbn/event-annotation-common';
import { isEsqlTableTypeDataset } from '../../../utils';
import type { DatasetType } from '../../../schema/dataset';
import { LENS_IGNORE_GLOBAL_FILTERS_DEFAULT_VALUE } from '../../../schema/constants';
import type { LensApiStaticValueOperation } from '../../../schema/metric_ops';
import type {
  DataLayerType,
  ReferenceLineLayerType,
  AnnotationLayerType,
  DataLayerTypeESQL,
  DataLayerTypeNoESQL,
  ReferenceLineLayerTypeESQL,
  ReferenceLineLayerTypeNoESQL,
} from '../../../schema/charts/xy';
import {
  buildDatasetState,
  generateApiLayer,
  isDataViewSpec,
  isFormBasedLayer,
  isTextBasedLayer,
  nonNullable,
  operationFromColumn,
} from '../../utils';
import { stripUndefined } from '../utils';
import { getValueApiColumn } from '../../columns/esql_column';
import { fromColorMappingLensStateToAPI, fromStaticColorLensStateToAPI } from '../../coloring';
import {
  isAPIColumnOfBucketType,
  isAPIColumnOfReferenceType,
  isAPIColumnOfType,
} from '../../columns/utils';

function convertDataLayerToAPI(
  visualization: XYDataLayerConfig,
  layer: Omit<FormBasedLayer, 'indexPatternId'>
): Omit<DataLayerTypeNoESQL, 'type' | 'dataset'>;
function convertDataLayerToAPI(
  visualization: XYDataLayerConfig,
  layer: TextBasedLayer
): Omit<DataLayerTypeESQL, 'type' | 'dataset'>;
function convertDataLayerToAPI(
  visualization: XYDataLayerConfig,
  layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer
): Omit<DataLayerTypeNoESQL, 'type' | 'dataset'> | Omit<DataLayerTypeESQL, 'type' | 'dataset'> {
  const yConfigMap = new Map(visualization.yConfig?.map((y) => [y.forAccessor, y]));
  if (isFormBasedLayer(layer)) {
    const x = visualization.xAccessor
      ? operationFromColumn(visualization.xAccessor, layer)
      : undefined;

    if (x && !isAPIColumnOfBucketType(x)) {
      throw new Error('X axis must be a bucket operation');
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const breakdown_by =
      visualization.splitAccessors && visualization.splitAccessors.length > 0
        ? operationFromColumn(visualization.splitAccessors[0], layer) // TODO temp fix for this PR until XY API will be upgraded to support multiple splits
        : undefined;

    if (breakdown_by && !isAPIColumnOfBucketType(breakdown_by)) {
      throw new Error('Breakdown by axis must be a bucket operation');
    }

    const y =
      visualization.accessors
        ?.map((accessor) => {
          const apiOperation = operationFromColumn(accessor, layer);
          if (
            !apiOperation ||
            isAPIColumnOfBucketType(apiOperation) ||
            isAPIColumnOfType<LensApiStaticValueOperation>('static_value', apiOperation)
          ) {
            return undefined;
          }
          const yConfig = yConfigMap.get(accessor);
          return {
            ...apiOperation,
            ...(visualization.colorMapping
              ? {}
              : yConfig?.color
              ? {
                  color: fromStaticColorLensStateToAPI(yConfig.color),
                }
              : {}),
          };
        })
        .filter(nonNullable) ?? [];
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const aggregate_first =
      visualization.splitAccessors &&
      visualization.splitAccessors.length > 0 &&
      visualization.xAccessor &&
      layer.columnOrder[0] === visualization.splitAccessors[0]; // TODO temp fix for this PR until XY API will be upgraded to support multiple splits
    return {
      ...generateApiLayer(layer),
      ...(x ? { x } : {}),
      y,
      ...(breakdown_by
        ? {
            breakdown_by: {
              ...breakdown_by,
              ...(visualization.collapseFn ? { collapse_by: visualization.collapseFn } : {}),
              ...(aggregate_first ? { aggregate_first: true } : {}),
              ...(visualization.colorMapping
                ? { color: fromColorMappingLensStateToAPI(visualization.colorMapping) }
                : {}),
            },
          }
        : {}),
    };
  }

  const x = visualization.xAccessor ? getValueApiColumn(visualization.xAccessor, layer) : undefined;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const breakdown_by =
    visualization.splitAccessors && visualization.splitAccessors.length > 0
      ? getValueApiColumn(visualization.splitAccessors[0], layer) // TODO temp fix for this PR until XY API will be upgraded to support multiple splits
      : undefined;
  const y = visualization.accessors?.map((accessor) => {
    const { color } = yConfigMap.get(accessor) || {};
    return {
      ...getValueApiColumn(accessor, layer),
      ...(color ? { color: fromStaticColorLensStateToAPI(color) } : {}),
    };
  });
  return {
    ...generateApiLayer(layer),
    ...(x ? { x } : {}),
    y: y || [],
    ...(breakdown_by
      ? {
          breakdown_by: {
            ...breakdown_by,
            ...(visualization.colorMapping
              ? { color: fromColorMappingLensStateToAPI(visualization.colorMapping) }
              : {}),
            ...(visualization.collapseFn ? { collapse_by: visualization.collapseFn } : {}),
          },
        }
      : {}),
  };
}

const seriesTypeFromStateToAPIMap: Record<SeriesType, DataLayerType['type']> = {
  bar: 'bar',
  bar_stacked: 'bar_stacked',
  bar_percentage_stacked: 'bar_percentage',
  bar_horizontal: 'bar_horizontal',
  bar_horizontal_stacked: 'bar_horizontal_stacked',
  bar_horizontal_percentage_stacked: 'bar_horizontal_percentage',
  line: 'line',
  area: 'area',
  area_stacked: 'area_stacked',
  area_percentage_stacked: 'area_percentage',
};

function convertSeriesTypeToAPIFormat(seriesType: SeriesType): DataLayerType['type'] {
  return seriesTypeFromStateToAPIMap[seriesType];
}

export function buildAPIDataLayer(
  visualization: XYDataLayerConfig,
  layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer,
  adHocDataViews: Record<string, unknown>,
  references: SavedObjectReference[],
  adhocReferences?: SavedObjectReference[]
): DataLayerType {
  const type = convertSeriesTypeToAPIFormat(visualization.seriesType);
  if (isTextBasedLayer(layer)) {
    const dataset = buildDatasetState(
      layer,
      visualization.layerId,
      adHocDataViews,
      references,
      adhocReferences
    );
    const baseLayer = convertDataLayerToAPI(visualization, layer);
    if (isEsqlTableTypeDataset(dataset)) {
      return {
        type,
        dataset,
        ...baseLayer,
      };
    }
    // this should be a never as schema should ensure this scenario never happens
    throw new Error('Text based layers can only be used with ESQL or Table datasets');
  }
  const dataset = buildDatasetState(
    layer,
    visualization.layerId,
    adHocDataViews,
    references,
    adhocReferences
  );

  if (isEsqlTableTypeDataset(dataset)) {
    // this should be a never as schema should ensure this scenario never happens
    throw new Error('Form based layers cannot be used with ESQL or Table datasets');
  }
  const baseLayer = convertDataLayerToAPI(visualization, layer);

  return {
    type,
    dataset,
    ...baseLayer,
  };
}

type ReferenceLineDef = ReferenceLineLayerType['thresholds'][number];

const referenceLinesAvailableIconsSet = new Set(Object.values(AvailableReferenceLineIcons));

function isReferenceLineValidIcon(icon: string | undefined): icon is AvailableReferenceLineIcon {
  return Boolean(icon && referenceLinesAvailableIconsSet.has(icon as AvailableReferenceLineIcon));
}

function convertReferenceLinesDecorationsToAPIFormat(
  yConfig: Omit<YConfig, 'forAccessor'>
): Pick<
  ReferenceLineDef,
  'color' | 'stroke_dash' | 'stroke_width' | 'icon' | 'fill' | 'axis' | 'text'
> {
  return stripUndefined({
    color: yConfig.color ? fromStaticColorLensStateToAPI(yConfig.color) : undefined,
    stroke_dash: yConfig.lineStyle,
    stroke_width: yConfig.lineWidth,
    icon: isReferenceLineValidIcon(yConfig.icon) ? yConfig.icon : undefined,
    fill: yConfig.fill && yConfig.fill !== 'none' ? yConfig.fill : undefined,
    axis: yConfig.axisMode && yConfig.axisMode !== 'auto' ? yConfig.axisMode : undefined,
    text: yConfig.textVisibility != null ? (yConfig.textVisibility ? 'label' : 'none') : undefined,
  });
}

function getLabelFromLayer(
  forAccessor: string,
  layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer
): string | undefined {
  if (isFormBasedLayer(layer)) {
    return layer.columns[forAccessor]?.label;
  }
  return layer.columns.find((col) => col.columnId === forAccessor)?.label;
}

function convertReferenceLineLayerToAPI(
  visualization: XYReferenceLineLayerConfig,
  layer: Omit<FormBasedLayer, 'indexPatternId'>
): Omit<ReferenceLineLayerTypeNoESQL, 'type' | 'dataset'>;
function convertReferenceLineLayerToAPI(
  visualization: XYReferenceLineLayerConfig,
  layer: TextBasedLayer
): Omit<ReferenceLineLayerTypeESQL, 'type' | 'dataset'>;
function convertReferenceLineLayerToAPI(
  visualization: XYReferenceLineLayerConfig,
  layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer
): Omit<ReferenceLineLayerType, 'type' | 'dataset'> {
  const yConfigMap = new Map(visualization.yConfig?.map((y) => [y.forAccessor, y]));
  const thresholds = (visualization.accessors
    ?.map((accessor): ReferenceLineDef | undefined => {
      const label = getLabelFromLayer(accessor, layer);
      const { forAccessor, ...yConfigRest } = yConfigMap.get(accessor) || {};
      const decorationConfig = convertReferenceLinesDecorationsToAPIFormat(yConfigRest);

      // this is very annoying as TS cannot seem to narrow the type correctly here
      // if we move this check outside the loop
      if (isFormBasedLayer(layer)) {
        const op = operationFromColumn(accessor, layer);
        if (op == null || isAPIColumnOfBucketType(op) || isAPIColumnOfReferenceType(op)) {
          return undefined;
        }
        return {
          ...op,
          ...(label != null ? { label } : {}),
          ...decorationConfig,
        };
      }
      const op = getValueApiColumn(accessor, layer);
      if (!op) {
        return undefined;
      }
      return {
        ...op,
        ...(label != null ? { label } : {}),
        ...decorationConfig,
      };
    })
    .filter(nonNullable) ?? []) satisfies ReferenceLineDef[];

  return {
    ...generateApiLayer(layer),
    // cannot really workout why satisfies works above and not here
    thresholds: thresholds as ReferenceLineLayerType['thresholds'],
  };
}

export function buildAPIReferenceLinesLayer(
  visualization: XYReferenceLineLayerConfig,
  layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer,
  adHocDataViews: Record<string, unknown>,
  references: SavedObjectReference[],
  adhocReferences?: SavedObjectReference[]
): ReferenceLineLayerType {
  const dataset = buildDatasetState(
    layer,
    visualization.layerId,
    adHocDataViews,
    references,
    adhocReferences
  );
  if (isTextBasedLayer(layer)) {
    if (isEsqlTableTypeDataset(dataset)) {
      return {
        type: 'referenceLines',
        dataset,
        ...convertReferenceLineLayerToAPI(visualization, layer),
      };
    }
    throw new Error('Text based layers can only be used with ESQL or Table datasets');
  }
  if (isEsqlTableTypeDataset(dataset)) {
    throw new Error('Form based layers cannot be used with ESQL or Table datasets');
  }
  return {
    type: 'referenceLines',
    dataset,
    ...convertReferenceLineLayerToAPI(visualization, layer),
  };
}

function findAnnotationDataView(layerId: string, references: SavedObjectReference[]) {
  const ref = references.find((r) => r.name === `xy-visualization-layer-${layerId}`);
  return ref?.id;
}

function getTextConfigurationForQueryAnnotation(
  annotation: XYAnnotationLayerConfig['annotations'][number]
): Pick<Extract<AnnotationLayerType['events'][number], { type: 'query' }>, 'text' | 'label'> {
  const textConfig = {
    ...('label' in annotation && annotation.label ? { label: annotation.label } : {}),
  };
  if ('textVisibility' in annotation && annotation.textVisibility != null) {
    if ('textField' in annotation && annotation.textField) {
      return {
        ...textConfig,
        text: { type: 'field', field: annotation.textField },
      };
    }
    return {
      ...textConfig,
      text: annotation.textVisibility ? 'label' : 'none',
    };
  }
  return textConfig;
}

export function buildAPIAnnotationsLayer(
  visualization: XYAnnotationLayerConfig,
  adHocDataViews: Record<string, unknown>,
  references: SavedObjectReference[],
  adhocReferences?: SavedObjectReference[]
): AnnotationLayerType {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const ignore_global_filters =
    visualization.ignoreGlobalFilters ?? LENS_IGNORE_GLOBAL_FILTERS_DEFAULT_VALUE;
  const adHocDataView = adHocDataViews[visualization.layerId];
  const referencedDataView = findAnnotationDataView(visualization.layerId, references);
  const dataset = (
    isDataViewSpec(adHocDataView) && adHocDataView?.id === visualization.indexPatternId
      ? {
          type: 'index',
          index: visualization.indexPatternId,
          time_field: adHocDataView.timeFieldName!,
        }
      : {
          type: 'dataView',
          id: referencedDataView ?? visualization.indexPatternId,
        }
  ) satisfies Extract<DatasetType, { type: 'index' | 'dataView' }>;
  return {
    type: 'annotations',
    dataset,
    ignore_global_filters,
    events: visualization.annotations.map((annotation) => {
      if (isQueryAnnotationConfig(annotation)) {
        return {
          type: 'query',
          label: annotation.label,
          query: annotation.filter
            ? {
                language: annotation.filter.language as 'kuery' | 'lucene',
                // it should never be a non-string here as schema ensures that
                query: typeof annotation.filter.query === 'string' ? annotation.filter.query : '',
              }
            : { language: 'kuery', query: '' },

          time_field: annotation.timeField!,
          ...(annotation.extraFields ? { extra_fields: annotation.extraFields } : {}),
          color: annotation.color ? fromStaticColorLensStateToAPI(annotation.color) : undefined,
          ...(annotation.isHidden != null ? { hidden: annotation.isHidden } : {}),
          ...getTextConfigurationForQueryAnnotation(annotation),
          ...(annotation.icon ? { icon: annotation.icon } : {}),
          // lineWidth isn't allowed to be zero, so the truthy check is valid here
          ...(annotation.lineWidth || annotation.lineStyle
            ? {
                line: {
                  stroke_width: annotation.lineWidth ? annotation.lineWidth : 1,
                  stroke_dash: annotation.lineStyle ? annotation.lineStyle : 'solid',
                },
              }
            : {}),
        };
      }
      if (isRangeAnnotationConfig(annotation)) {
        return {
          type: 'range',
          interval: {
            from: annotation.key.timestamp,
            to: annotation.key.endTimestamp,
          },
          color: annotation.color ? fromStaticColorLensStateToAPI(annotation.color) : undefined,
          fill: annotation.outside ? 'outside' : 'inside',
          ...(annotation.isHidden != null ? { hidden: annotation.isHidden } : {}),
          ...(annotation.label ? { label: annotation.label } : {}),
        };
      }

      return {
        type: 'point',
        timestamp: annotation.key.timestamp,
        color: annotation.color ? fromStaticColorLensStateToAPI(annotation.color) : undefined,
        ...(annotation.isHidden != null ? { hidden: annotation.isHidden } : {}),
        ...(annotation.textVisibility != null
          ? {
              text: annotation.textVisibility ? 'label' : 'none',
            }
          : {}),
        ...(annotation.label ? { label: annotation.label } : {}),
        ...(annotation.icon ? { icon: annotation.icon } : {}),
        ...(annotation.lineWidth || annotation.lineStyle
          ? {
              line: {
                stroke_width: annotation.lineWidth ? annotation.lineWidth : 1,
                stroke_dash: annotation.lineStyle ? annotation.lineStyle : 'solid',
              },
            }
          : {}),
      };
    }),
  };
}
