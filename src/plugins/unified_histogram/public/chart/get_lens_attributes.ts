/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type {
  CountIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  GenericIndexPatternColumn,
  TermsIndexPatternColumn,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';

export const getLensAttributes = ({
  data,
  dataView,
  timeInterval,
  breakdownField,
}: {
  data: DataPublicPluginStart;
  dataView: DataView;
  timeInterval: string | undefined;
  breakdownField: DataViewField | undefined;
}) => {
  const filters = data.query.filterManager.getFilters();
  const query = data.query.queryString.getQuery();
  const showBreakdown = breakdownField?.aggregatable;

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
      label: 'Count of records',
      operationType: 'count',
      scale: 'ratio',
      sourceField: '___records___',
    } as CountIndexPatternColumn,
  };

  if (showBreakdown) {
    columns = {
      ...columns,
      breakdown_column: {
        dataType: 'string',
        isBucketed: true,
        label: `Top 3 values of ${breakdownField.name}`,
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
          otherBucket: false,
          missingBucket: false,
          parentFormat: {
            id: 'terms',
          },
        },
      } as TermsIndexPatternColumn,
    };
  }

  return {
    title: '',
    references: [
      {
        id: dataView.id ?? '',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: dataView.id ?? '',
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            layer1: { columnOrder, columns },
          },
        },
      },
      filters,
      query: 'language' in query ? query : { language: 'kuery', query: '' },
      visualization: {
        layers: [
          {
            accessors: ['count_column'],
            layerId: 'layer1',
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
        },
        preferredSeriesType: 'bar_stacked',
        valueLabels: 'hide',
        fittingFunction: 'None',
        axisTitlesVisibilitySettings: {
          x: false,
          yLeft: false,
          yRight: true,
        },
        gridlinesVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: true,
        },
        tickLabelsVisibilitySettings: {
          x: true,
          yLeft: true,
          yRight: true,
        },
      },
    },
    visualizationType: 'lnsXY',
  } as TypedLensByValueInput['attributes'];
};
