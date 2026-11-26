/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger, SavedObjectReference } from '@kbn/core/server';
import {
  fromStoredFilters,
  toStoredFilters,
  type StoredFilter,
} from '@kbn/as-code-filters-transforms';
import { extractReferences, injectReferences } from '@kbn/data-plugin/common';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import type {
  ChangePointGridEsqlConfiguration,
  ChangePointGridFormConfiguration,
} from '@kbn/discover-utils';
import type { Filter } from '@kbn/es-query';
import type { ChangePointGridEmbeddableState } from './change_point_grid_schema';

export const CHANGE_POINT_GRID_CONFIG_DATA_VIEW_REF_NAME =
  'change_point_grid_configuration_data_view';

type StaticContext = NonNullable<ChangePointGridEmbeddableState['static_context']>;
type Configuration = NonNullable<ChangePointGridEmbeddableState['configuration']>;

type StoredChangePointGridConfiguration =
  | Omit<ChangePointGridFormConfiguration, 'data_view_id'>
  | ChangePointGridEsqlConfiguration;

/** Static filters and the form data view are stored as saved-object references. */
export type StoredChangePointGridState = Omit<
  ChangePointGridEmbeddableState,
  'static_context' | 'configuration'
> & {
  static_context?: Omit<StaticContext, 'filters'> & { filters?: StoredFilter[] };
  configuration?: StoredChangePointGridConfiguration;
};

const toFilters = (storedFilters: StoredFilter[]): Filter[] =>
  storedFilters.map(({ $state, ...filter }) =>
    $state?.store ? { ...filter, $state: { store: $state.store } } : filter
  );

const transformFiltersIn = (
  filters: StaticContext['filters'],
  logger?: Logger
): { filters?: StoredFilter[]; references: SavedObjectReference[] } => {
  const storedFilters = toStoredFilters(filters, logger);
  if (!storedFilters?.length) return { filters: storedFilters, references: [] };

  const [{ filter }, references] = extractReferences({ filter: toFilters(storedFilters) });
  return { filters: filter, references };
};

const transformFiltersOut = (
  storedFilters: StoredFilter[] | undefined,
  references: SavedObjectReference[] = [],
  logger?: Logger
): StaticContext['filters'] => {
  if (!storedFilters?.length) return fromStoredFilters(storedFilters, logger);

  let filters = storedFilters;
  try {
    filters =
      injectReferences({ filter: toFilters(storedFilters) }, references).filter ?? storedFilters;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger?.warn(`Unable to inject change point grid panel filter references. Error: ${message}`);
  }
  return fromStoredFilters(filters, logger);
};

const transformConfigurationIn = (
  configuration: Configuration
): { configuration: StoredChangePointGridConfiguration; references: SavedObjectReference[] } => {
  if (configuration.mode !== 'form') {
    return { configuration, references: [] };
  }
  const { data_view_id: dataViewId, ...storedConfiguration } = configuration;
  return {
    configuration: storedConfiguration,
    references: [
      {
        type: DATA_VIEW_SAVED_OBJECT_TYPE,
        name: CHANGE_POINT_GRID_CONFIG_DATA_VIEW_REF_NAME,
        id: dataViewId,
      },
    ],
  };
};

const transformConfigurationOut = (
  storedConfiguration: StoredChangePointGridConfiguration,
  references: SavedObjectReference[] = [],
  logger?: Logger
): Configuration => {
  if (storedConfiguration.mode !== 'form') {
    return storedConfiguration;
  }
  const dataViewId = references.find(
    (ref) => ref.name === CHANGE_POINT_GRID_CONFIG_DATA_VIEW_REF_NAME
  )?.id;
  // The panel still has its query, so it stays editable as direct ES|QL.
  if (!dataViewId) {
    logger?.warn('Unable to inject change point grid panel configuration data view reference.');
    return { mode: 'esql' };
  }
  return { ...storedConfiguration, data_view_id: dataViewId };
};

export const getChangePointGridTransforms = (logger?: Logger) => ({
  transformIn: (
    state: ChangePointGridEmbeddableState
  ): { state: StoredChangePointGridState; references: SavedObjectReference[] } => {
    const { configuration, ...panelState } = state;
    let storedState = panelState as StoredChangePointGridState;
    const references: SavedObjectReference[] = [];

    const filters = panelState.static_context?.filters;
    if (panelState.static_context && filters?.length) {
      const filtersIn = transformFiltersIn(filters, logger);
      storedState = {
        ...storedState,
        static_context: { ...panelState.static_context, filters: filtersIn.filters },
      };
      references.push(...filtersIn.references);
    }

    if (configuration) {
      const configurationIn = transformConfigurationIn(configuration);
      storedState = { ...storedState, configuration: configurationIn.configuration };
      references.push(...configurationIn.references);
    }

    return { state: storedState, references };
  },
  transformOut: (
    storedState: StoredChangePointGridState,
    panelReferences?: SavedObjectReference[]
  ): ChangePointGridEmbeddableState => {
    const { configuration: storedConfiguration, ...storedPanelState } = storedState;
    let state = storedPanelState as ChangePointGridEmbeddableState;

    const filters = storedPanelState.static_context?.filters;
    if (storedPanelState.static_context && filters?.length) {
      state = {
        ...state,
        static_context: {
          ...storedPanelState.static_context,
          filters: transformFiltersOut(filters, panelReferences, logger),
        },
      };
    }

    if (storedConfiguration) {
      state = {
        ...state,
        configuration: transformConfigurationOut(storedConfiguration, panelReferences, logger),
      };
    }

    return state;
  },
});
