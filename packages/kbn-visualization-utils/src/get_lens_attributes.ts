/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import type { Ast } from '@kbn/interpreter';
import type { IconType } from '@elastic/eui/src/components/icon/icon';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { AggregateQuery, Query, Filter } from '@kbn/es-query';

/**
 * Indicates what was changed in this table compared to the currently active table of this layer.
 * * `initial` means the layer associated with this table does not exist in the current configuration
 * * `unchanged` means the table is the same in the currently active configuration
 * * `reduced` means the table is a reduced version of the currently active table (some columns dropped, but not all of them)
 * * `extended` means the table is an extended version of the currently active table (added one or multiple additional columns)
 * * `reorder` means the table columns have changed order, which change the data as well
 * * `layers` means the change is a change to the layer structure, not to the table
 */
export type TableChangeType =
  | 'initial'
  | 'unchanged'
  | 'reduced'
  | 'extended'
  | 'reorder'
  | 'layers';

export interface Suggestion<T = unknown, V = unknown> {
  visualizationId: string;
  datasourceState?: V;
  datasourceId?: string;
  columns: number;
  score: number;
  title: string;
  visualizationState: T;
  previewExpression?: Ast | string;
  previewIcon: IconType;
  hide?: boolean;
  // flag to indicate if the visualization is incomplete
  incomplete?: boolean;
  changeType: TableChangeType;
  keptLayerIds: string[];
}

export const getLensAttributes = ({
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
      : i18n.translate('xpack.lens.config.suggestion.title', {
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
