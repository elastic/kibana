/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PaletteOutput } from '@kbn/coloring';
import { getValidColor } from '@kbn/coloring';
import { v4 } from 'uuid';
import { transparentize } from '@elastic/eui';
import { euiLightVars } from '@kbn/ui-theme';
import { groupBy } from 'lodash';
import type { YAxisMode, XYLayerConfig, XYAnnotationLayerConfig } from '@kbn/lens-common';
import { FillStyles } from '@kbn/expression-xy-plugin/common';
import type { AvailableAnnotationIcon, EventAnnotationConfig } from '@kbn/event-annotation-common';
import type { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import { getDefaultQueryLanguage } from '../../../../application/components/lib/get_default_query_language';
import { ICON_TYPES_MAP } from '../../../../application/visualizations/constants';
import { SUPPORTED_METRICS } from '../../metrics';
import type { Annotation, Metric, Panel, Series } from '../../../../../common/types';
import { getSeriesAgg } from '../../series';
import type { Column, Layer, AnyColumnWithReferences } from '../../convert';
import { isPercentileRanksColumnWithMeta, isPercentileColumnWithMeta } from '../../convert';
import { getChartType } from './chart_type';
import { extractOrGenerateDatasourceInfo } from '../../datasource';

export const isColumnWithReference = (column: Column): column is AnyColumnWithReferences =>
  Boolean((column as AnyColumnWithReferences).references);

function getPalette(palette: PaletteOutput): PaletteOutput {
  return !palette || palette.name === 'gradient' || palette.name === 'rainbow'
    ? { name: 'default', type: 'palette' }
    : palette;
}

function getAxisMode(series: Series, model: Panel): YAxisMode {
  return (series.separate_axis ? series.axis_position : model.axis_position) as YAxisMode;
}

function getColor(
  metricColumn: Column,
  metric: Metric,
  seriesColor: string,
  splitAccessors: string[]
) {
  const hasSplitAccessors = splitAccessors.length > 0;
  if (isPercentileColumnWithMeta(metricColumn) && !hasSplitAccessors) {
    const [_, percentileIndex] = metricColumn.meta.reference.split('.');
    return metric.percentiles?.[parseInt(percentileIndex, 10)]?.color;
  }
  if (isPercentileRanksColumnWithMeta(metricColumn) && !hasSplitAccessors) {
    const [_, percentileRankIndex] = metricColumn.meta.reference.split('.');
    return metric.colors?.[parseInt(percentileRankIndex, 10)];
  }

  return seriesColor;
}

function nonNullable<T>(value: T): value is NonNullable<T> {
  return value != null;
}

export const getLayers = async (
  dataSourceLayers: Record<number, Layer>,
  model: Panel,
  dataViews: DataViewsPublicPluginStart,
  isSingleAxis: boolean = false
): Promise<XYLayerConfig[] | null> => {
  const nonAnnotationsLayers: XYLayerConfig[] = Object.keys(dataSourceLayers).map((key) => {
    const series = model.series[parseInt(key, 10)];
    const { metrics, seriesAgg } = getSeriesAgg(series.metrics);
    const dataSourceLayer = dataSourceLayers[parseInt(key, 10)];
    const referenceColumn = dataSourceLayer.columns.find(
      (column): column is AnyColumnWithReferences => isColumnWithReference(column)
    );
    // as pipiline aggregation has only one reference id
    const referenceColumnId = referenceColumn?.references[0];
    // we should not include columns which using as reference for pipeline aggs
    const metricColumns = dataSourceLayer.columns.filter(
      (l) => !l.isBucketed && l.columnId !== referenceColumnId
    );
    const isReferenceLine =
      metricColumns.length === 1 && metricColumns[0].operationType === 'static_value';
    const splitAccessors = dataSourceLayer.columns
      .filter((column) => column.isBucketed && column.isSplit)
      .map((c) => c.columnId);
    const chartType = getChartType(series, model.type);
    const commonProps = {
      layerId: dataSourceLayer.layerId,
      accessors: metricColumns.map((metricColumn) => {
        return metricColumn.columnId;
      }),
      yConfig: metricColumns.map((metricColumn) => {
        const metric = metrics.find(
          (m) => SUPPORTED_METRICS[m.type]?.name === metricColumn.operationType
        );
        return {
          forAccessor: metricColumn.columnId,
          color: getColor(metricColumn, metric!, series.color, splitAccessors),
          axisMode: isReferenceLine // reference line should be assigned to axis with real data
            ? model.series.some((s) => s.id !== series.id && getAxisMode(s, model) === 'right')
              ? 'right'
              : 'left'
            : isSingleAxis
            ? 'left'
            : getAxisMode(series, model),
          ...(isReferenceLine && {
            fill: chartType.includes('area') ? FillStyles.BELOW : FillStyles.NONE,
            lineWidth: series.line_width,
          }),
        };
      }),
    };
    if (isReferenceLine) {
      return {
        layerType: 'referenceLine',
        ...commonProps,
      };
    } else {
      return {
        seriesType: chartType,
        layerType: 'data',
        ...commonProps,
        xAccessor: dataSourceLayer.columns.find((column) => column.isBucketed && !column.isSplit)
          ?.columnId,
        splitAccessors: splitAccessors.length > 0 ? splitAccessors : undefined,
        collapseFn: seriesAgg,
        palette: getPalette(series.palette as PaletteOutput),
      };
    }
  });
  if (!model.annotations || !model.annotations.length) {
    return nonAnnotationsLayers;
  }

  const annotationsByIndexPatternAndIgnoreFlag = groupBy(model.annotations, (a) => {
    const id =
      typeof a.index_pattern === 'object' && 'id' in a.index_pattern
        ? a.index_pattern.id
        : a.index_pattern;
    return `${id}-${a.time_field ?? ''}-${Boolean(a.ignore_global_filters)}`;
  });

  try {
    const annotationsLayers: Array<XYAnnotationLayerConfig | undefined> = await Promise.all(
      Object.values(annotationsByIndexPatternAndIgnoreFlag).map(async (annotations) => {
        const [firstAnnotation] = annotations;
        const convertedAnnotations: EventAnnotationConfig[] = [];

        const result = await extractOrGenerateDatasourceInfo(
          firstAnnotation.index_pattern,
          firstAnnotation.time_field,
          false,
          undefined,
          undefined,
          dataViews
        );

        if (!result) {
          throw new Error('Invalid annotation datasource');
        }
        const { indexPattern } = result;
        if (indexPattern) {
          annotations.forEach((a: Annotation) => {
            const lensAnnotation = convertAnnotation(a, indexPattern);
            if (lensAnnotation) {
              convertedAnnotations.push(lensAnnotation);
            }
          });
          return {
            layerId: v4(),
            layerType: 'annotations',
            ignoreGlobalFilters: Boolean(firstAnnotation.ignore_global_filters),
            annotations: convertedAnnotations,
            indexPatternId: indexPattern.id!,
          };
        }
      })
    );

    return nonAnnotationsLayers.concat(...annotationsLayers.filter(nonNullable));
  } catch (e) {
    return null;
  }
};

function getEventIcon(annotationIcon: string | undefined): AvailableAnnotationIcon {
  if (
    !annotationIcon ||
    !(annotationIcon in ICON_TYPES_MAP) ||
    typeof ICON_TYPES_MAP[annotationIcon] !== 'string'
  ) {
    return 'triangle';
  }
  return ICON_TYPES_MAP[annotationIcon] as AvailableAnnotationIcon;
}

const convertAnnotation = (
  annotation: Annotation,
  dataView: DataView
): EventAnnotationConfig | undefined => {
  const extraFields = annotation.fields
    ?.replace(/\s/g, '')
    .split(',')
    .map((field) => {
      const dataViewField = dataView.getFieldByName(field);
      return dataViewField && dataViewField.aggregatable ? field : undefined;
    })
    .filter(nonNullable);

  return {
    type: 'query',
    id: annotation.id,
    label: 'Event',
    key: {
      type: 'point_in_time',
    },
    color: getValidColor(transparentize(annotation.color || euiLightVars.euiColorAccent, 1), {
      shouldBeCompatibleWithColorJs: true,
    }).hex(),
    timeField: annotation.time_field || dataView.timeFieldName,
    icon: getEventIcon(annotation.icon),
    filter: {
      type: 'kibana_query',
      query: annotation.query_string?.query || '*',
      language: annotation.query_string?.language || getDefaultQueryLanguage(),
    },
    extraFields,
    isHidden: annotation.hidden,
  };
};
