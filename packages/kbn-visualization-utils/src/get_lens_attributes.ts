/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { AggregateQuery, Query, Filter } from '@kbn/es-query';
import type { Suggestion } from './types';

export const getLensAttributesFromSuggestion = ({
  filters,
  query,
  suggestion,
  dataView,
}: {
  filters: Filter[];
  query: Query | AggregateQuery;
  suggestion: Suggestion | undefined;
  dataView?: DataView;
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
      : i18n.translate('visualizationUtils.config.suggestion.title', {
          defaultMessage: 'New suggestion',
        }),
    references: [
      {
        id: dataView?.id ?? '',
        name: `textBasedLanguages-datasource-layer-suggestion`,
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
          adHocDataViews: { [dataView.id]: dataView.toSpec(false) },
        }),
    },
    visualizationType: suggestion ? suggestion.visualizationId : 'lnsXY',
  };
  return attributes;
};
