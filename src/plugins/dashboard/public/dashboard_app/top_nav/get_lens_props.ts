/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { TypedLensByValueInput, Suggestion } from '@kbn/lens-plugin/public';

export const getLensAttributes = ({
  title,
  filters,
  query,
  dataView,
  suggestion,
  timefilter,
}: {
  title?: string;
  filters: Filter[];
  query: Query | AggregateQuery;
  dataView?: DataView;
  suggestion: Suggestion | undefined;
  timefilter: DataPublicPluginStart['query']['timefilter'];
}) => {
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
          formBased: {},
        };
  const visualization = suggestionVisualizationState;
  const attributes = {
    title: suggestion
      ? suggestion.title
      : title ??
        i18n.translate('unifiedHistogram.lensTitle', {
          defaultMessage: 'Edit visualization',
        }),
    references: [
      {
        id: dataView?.id ?? '',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: dataView?.id ?? '',
        name: 'indexpattern-datasource-layer-unifiedHistogram',
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates,
      filters,
      query,
      visualization,
    },
    visualizationType: suggestion ? suggestion.visualizationId : 'lnsXY',
  } as TypedLensByValueInput['attributes'];

  const props = {
    id: 'dashboardPreview',
    viewMode: ViewMode.VIEW,
    timeRange: timefilter.timefilter.getTime(),
    attributes,
    noPadding: true,
    searchSessionId: undefined,
    executionContext: {
      description: 'fetch chart data and total hits',
    },
  };

  return props;
};
