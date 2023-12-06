/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type {
  CountIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  GenericIndexPatternColumn,
  TermsIndexPatternColumn,
  TypedLensByValueInput,
  Suggestion,
} from '@kbn/lens-plugin/public';
import { LegendSize } from '@kbn/visualizations-plugin/public';
import { XYConfiguration } from '@kbn/visualizations-plugin/common';
import { fieldSupportsBreakdown } from './field_supports_breakdown';

export interface LensRequestData {
  dataViewId?: string;
  timeField?: string;
  timeInterval?: string;
  breakdownField?: string;
}

export interface LensAttributesContext {
  attributes: TypedLensByValueInput['attributes'];
  requestData: LensRequestData;
}

export const getLensAttributes = ({
  title,
  filters,
  query,
  dataView,
  timeInterval,
  breakdownField,
  suggestion,
}: {
  title?: string;
  filters: Filter[];
  query: Query | AggregateQuery;
  dataView: DataView;
  timeInterval: string | undefined;
  breakdownField: DataViewField | undefined;
  suggestion: Suggestion | undefined;
}): LensAttributesContext => {
  const showBreakdown = breakdownField && fieldSupportsBreakdown(breakdownField);

  let columnOrder = ['date_column', 'count_column'];

  if (showBreakdown) {
    columnOrder = ['breakdown_column', ...columnOrder];
  }

  let columns: Record<string, GenericIndexPatternColumn> = {
    date_column: {
      dataType: 'date',
      isBucketed: true,
      label: dataView.timeFieldName ?? '',
      operationType: 'date_histogram',
      scale: 'interval',
      sourceField: dataView.timeFieldName,
      params: {
        interval: timeInterval ?? 'auto',
      },
    } as DateHistogramIndexPatternColumn,
    count_column: {
      dataType: 'number',
      isBucketed: false,
      label: i18n.translate('unifiedHistogram.countColumnLabel', {
        defaultMessage: 'Count of records',
      }),
      operationType: 'count',
      scale: 'ratio',
      sourceField: '___records___',
      params: {
        format: {
          id: 'number',
          params: {
            decimals: 0,
          },
        },
      },
    } as CountIndexPatternColumn,
  };

  if (showBreakdown) {
    columns = {
      ...columns,
      breakdown_column: {
        dataType: 'string',
        isBucketed: true,
        label: i18n.translate('unifiedHistogram.breakdownColumnLabel', {
          defaultMessage: 'Top 3 values of {fieldName}',
          values: { fieldName: breakdownField?.displayName },
        }),
        operationType: 'terms',
        scale: 'ordinal',
        sourceField: breakdownField.name,
        params: {
          size: 3,
          orderBy: {
            type: 'column',
            columnId: 'count_column',
          },
          orderDirection: 'desc',
          otherBucket: true,
          missingBucket: false,
          parentFormat: {
            id: 'terms',
          },
        },
      } as TermsIndexPatternColumn,
    };
  }

  const suggestionDatasourceState = Object.assign({}, suggestion?.datasourceState);
  const suggestionVisualizationState = Object.assign({}, suggestion?.visualizationState);
  const datasourceStates =
    suggestion && suggestion.datasourceState
      ? {
          [suggestion.datasourceId!]: {
            ...suggestionDatasourceState,
          },
        }
      : {
          formBased: {
            layers: {
              unifiedHistogram: { columnOrder, columns },
            },
          },
        };
  const visualization = suggestion
    ? {
        ...suggestionVisualizationState,
      }
    : ({
        layers: [
          {
            accessors: ['count_column'],
            layerId: 'unifiedHistogram',
            layerType: 'data',
            seriesType: 'bar_stacked',
            xAccessor: 'date_column',
            ...(showBreakdown
              ? { splitAccessor: 'breakdown_column' }
              : {
                  yConfig: [
                    {
                      forAccessor: 'count_column',
                    },
                  ],
                }),
          },
        ],
        legend: {
          isVisible: true,
          position: 'right',
          legendSize: LegendSize.EXTRA_LARGE,
          shouldTruncate: false,
        },
        preferredSeriesType: 'bar_stacked',
        valueLabels: 'hide',
        fittingFunction: 'None',
        minBarHeight: 2,
        showCurrentTimeMarker: true,
        axisTitlesVisibilitySettings: {
          x: false,
          yLeft: false,
          yRight: false,
        },
        gridlinesVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: false,
        },
        tickLabelsVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: false,
        },
      } as XYConfiguration);
  const attributes = {
    title:
      title ??
      suggestion?.title ??
      i18n.translate('unifiedHistogram.lensTitle', {
        defaultMessage: 'Edit visualization',
      }),
    references: [
      {
        id: dataView.id ?? '',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: dataView.id ?? '',
        name: 'indexpattern-datasource-layer-unifiedHistogram',
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates,
      filters,
      query,
      visualization,
      ...(dataView &&
        dataView.id &&
        !dataView.isPersisted() && {
          adHocDataViews: {
            [dataView.id]: dataView.toSpec(false),
          },
        }),
    },
    visualizationType: suggestion ? suggestion.visualizationId : 'lnsXY',
  } as TypedLensByValueInput['attributes'];

  return {
    attributes,
    requestData: {
      dataViewId: dataView.id,
      timeField: dataView.timeFieldName,
      timeInterval,
      breakdownField: breakdownField?.name,
    },
  };
};
