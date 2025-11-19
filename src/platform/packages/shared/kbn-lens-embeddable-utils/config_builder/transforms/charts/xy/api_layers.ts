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
import type { SavedObjectReference } from '@kbn/core/server';
import type { DatasetType } from '../../../schema/dataset';
import { LENS_IGNORE_GLOBAL_FILTERS_DEFAULT_VALUE } from '../../../schema/constants';
import type { LensApiBucketOperations } from '../../../schema/bucket_ops';
import type { LensApiAllMetricOperations } from '../../../schema/metric_ops';
import type {
  DataLayerType,
  ReferenceLineLayerType,
  AnnotationLayerType,
  DataLayerTypeNoESQL,
} from '../../../schema/charts/xy';
import {
  buildDatasetState,
  generateApiLayer,
  isDataViewSpec,
  operationFromColumn,
} from '../../utils';
import { getValueApiColumn } from '../../columns/esql_column';
import { fromColorMappingLensStateToAPI, fromStaticColorLensStateToAPI } from '../../coloring';
import { isFormBasedLayer } from './helpers';

function convertDataLayerToAPI(
  visualization: XYDataLayerConfig,
  layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer
): Omit<DataLayerType, 'type' | 'dataset'> {
  const yConfigMap = new Map(visualization.yConfig?.map((y) => [y.forAccessor, y]));
  if (isFormBasedLayer(layer)) {
    const x = visualization.xAccessor
      ? (operationFromColumn(visualization.xAccessor, layer) as LensApiBucketOperations)
      : undefined;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const breakdown_by = visualization.splitAccessor
      ? (operationFromColumn(visualization.splitAccessor, layer) as LensApiBucketOperations)
      : undefined;

    const y = visualization.accessors?.map((accessor) => {
      const apiOperation = operationFromColumn(accessor, layer) as LensApiAllMetricOperations;
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
      } as DataLayerTypeNoESQL['y'][number];
    });
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const aggregate_first =
      visualization.splitAccessor &&
      visualization.xAccessor &&
      layer.columnOrder[0] === visualization.splitAccessor;
    return {
      ...generateApiLayer(layer),
      ...(x ? { x } : {}),
      y: y || [],
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
  const breakdown_by = visualization.splitAccessor
    ? getValueApiColumn(visualization.splitAccessor, layer)
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
          breakdown_by,
        }
      : {}),
  };
}

function convertSeriesTypeToAPIFormat(seriesType: SeriesType): DataLayerType['type'] {
  if (seriesType.includes('percentage')) {
    return seriesType.replace('_stacked', '') as DataLayerType['type'];
  }
  return seriesType as DataLayerType['type'];
}

export function buildAPIDataLayer(
  visualization: XYDataLayerConfig,
  layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer,
  adHocDataViews: Record<string, unknown>,
  references: SavedObjectReference[],
  adhocReferences?: SavedObjectReference[]
): DataLayerType {
  const dataset = buildDatasetState(
    layer,
    adHocDataViews,
    references,
    adhocReferences,
    visualization.layerId
  );

  const baseLayer = convertDataLayerToAPI(visualization, layer);
  const type = convertSeriesTypeToAPIFormat(visualization.seriesType);

  return {
    type,
    dataset,
    ...baseLayer,
  } as DataLayerType;
}

type ReferenceLineDef = ReferenceLineLayerType['thresholds'][number];

function convertReferenceLinesDecorationsToAPIFormat(
  yConfig: Omit<YConfig, 'forAccessor'>
): Pick<ReferenceLineDef, 'color' | 'stroke_dash' | 'stroke_width' | 'icon' | 'fill'> {
  return {
    ...(yConfig.color ? { color: fromStaticColorLensStateToAPI(yConfig.color) } : {}),
    ...(yConfig.lineStyle
      ? {
          stroke_dash:
            yConfig.lineStyle === 'solid'
              ? 'straight'
              : (yConfig.lineStyle satisfies ReferenceLineDef['stroke_dash']),
        }
      : {}),
    ...(yConfig.lineWidth ? { stroke_width: yConfig.lineWidth } : {}),
    ...(yConfig.icon ? { icon: yConfig.icon } : {}),
    ...(yConfig.fill && yConfig.fill !== 'none' ? { fill: yConfig.fill } : {}),
    ...(yConfig.axisMode ? { axis: yConfig.axisMode } : {}),
  };
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
  layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer
): Omit<ReferenceLineLayerType, 'type' | 'dataset'> {
  const isFormBased = isFormBasedLayer(layer);
  const yConfigMap = new Map(visualization.yConfig?.map((y) => [y.forAccessor, y]));
  const thresholds =
    visualization.accessors?.map((accessor) => {
      const op = isFormBased
        ? (operationFromColumn(accessor, layer) as LensApiAllMetricOperations)
        : getValueApiColumn(accessor, layer);
      const label = getLabelFromLayer(accessor, layer);
      const { forAccessor, ...yConfigRest } = yConfigMap.get(accessor) || {};
      return {
        ...op,
        ...(label != null ? { text: { type: 'label', text: label } } : {}),
        ...convertReferenceLinesDecorationsToAPIFormat(yConfigRest),
      } as ReferenceLineLayerType['thresholds'][number];
    }) ?? [];

  return {
    ...generateApiLayer(layer),
    thresholds,
  } as Omit<ReferenceLineLayerType, 'type' | 'dataset'>;
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
    adHocDataViews,
    references,
    adhocReferences,
    visualization.layerId
  );
  return {
    type: 'referenceLines',
    dataset,
    ...convertReferenceLineLayerToAPI(visualization, layer),
  } as ReferenceLineLayerType;
}

function findAnnotationDataView(layerId: string, references: SavedObjectReference[]) {
  const ref = references.find((r) => r.name === `xy-visualization-layer-${layerId}`);
  return ref?.id;
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
      if (annotation.type === 'query') {
        return {
          type: 'query',
          name: annotation.label,
          ...(annotation.filter
            ? {
                query: {
                  language: annotation.filter.language as 'kuery' | 'lucene',
                  query: annotation.filter.query as string,
                },
              }
            : { query: { language: 'kuery', query: '' } }),
          time_field: annotation.timeField!,
          extra_fields: annotation.extraFields,
          color: annotation.color ? fromStaticColorLensStateToAPI(annotation.color) : undefined,
          hidden: annotation.isHidden,
        };
      }
      if (annotation.key.type === 'range') {
        return {
          type: 'range',
          name: annotation.label,
          interval: {
            from: annotation.key.timestamp,
            to: annotation.key.endTimestamp,
          },
          color: annotation.color ? fromStaticColorLensStateToAPI(annotation.color) : undefined,
          fill: 'outside' in annotation && annotation.outside ? 'outside' : 'inside',
          hidden: annotation.isHidden,
        };
      }
      return {
        type: 'point',
        name: annotation.label,
        timestamp: annotation.key.timestamp,
        color: annotation.color ? fromStaticColorLensStateToAPI(annotation.color) : undefined,
        hidden: annotation.isHidden,
      };
    }),
  };
}
