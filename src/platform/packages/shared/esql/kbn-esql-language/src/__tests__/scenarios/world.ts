/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks, ESQLFieldWithMetadata } from '@kbn/esql-types';
import {
  editorExtensions,
  joinIndices,
  lookupIndexFields,
  mockContext,
  policies,
  timeseriesIndices,
} from '../commands/context_fixtures';
import type { ScenarioWorld } from './types';

const { recommendedQueries, recommendedFields } = editorExtensions;

// The command-level tests assert against `mockContext`, so the default world serves the same
// columns and resources through the callbacks.
const defaultColumns: ESQLFieldWithMetadata[] = Array.from(
  mockContext.columns.values(),
  ({ name, type }) => ({ name, type, userDefined: false } as ESQLFieldWithMetadata)
);

const defaultLookupColumns = lookupIndexFields.map(
  ({ name, type }) => ({ name, type, userDefined: false } as ESQLFieldWithMetadata)
);

// The query the editor is asked to resolve when it needs the columns of a single index.
const SINGLE_SOURCE_QUERY = /^\s*FROM\s+(\S+)\s*$/i;

export const DEFAULT_WORLD: ScenarioWorld = {
  columns: defaultColumns,
  sources: mockContext.sources ?? [],
  views: [],
  datasets: [],
  supportsResourceBrowser: false,
  policies,
  joinIndices,
  lookupColumns: Object.fromEntries(joinIndices.map(({ name }) => [name, defaultLookupColumns])),
  canCreateLookupIndex: true,
  timeseriesIndices,
  inferenceEndpoints: mockContext.inferenceEndpoints ?? [],
  recommendedQueries,
  recommendedFields,
  histogramBarTarget: mockContext.histogramBarTarget ?? 50,
  license: 'platinum',
  activeProduct: mockContext.activeProduct,
  isServerless: false,
  supportsControls: false,
  variables: [],
};

/** Builds the editor callbacks that answer from a scenario world. */
export const createCallbacks = (overrides: Partial<ScenarioWorld> = {}): ESQLCallbacks => {
  const world: ScenarioWorld = { ...DEFAULT_WORLD, ...overrides };

  return {
    getColumnsFor: async ({ query } = { query: '' }) => {
      const [, source = ''] = query.match(SINGLE_SOURCE_QUERY) ?? [];

      return [...(world.lookupColumns[source] ?? world.columns)];
    },
    getSources: async () => [...world.sources],
    getViews: async () => ({ views: [...world.views] }),
    getDatasets: async () => ({ datasets: [...world.datasets] }),
    canSuggestResourceBrowser: async () => world.supportsResourceBrowser,
    getPolicies: async () => [...world.policies],
    getJoinIndices: async () => ({ indices: [...world.joinIndices] }),
    canCreateLookupIndex: async () => world.canCreateLookupIndex,
    getTimeseriesIndices: async () => ({ indices: [...world.timeseriesIndices] }),
    getInferenceEndpoints: async (taskType) => ({
      inferenceEndpoints: world.inferenceEndpoints.filter(
        ({ task_type: endpointTaskType }) => endpointTaskType === taskType
      ),
    }),
    getEditorExtensions: async () => ({
      recommendedQueries: [...world.recommendedQueries],
      recommendedFields: [...world.recommendedFields],
    }),
    getPreferences: async () => ({ histogramBarTarget: world.histogramBarTarget }),
    getLicense: async () => ({
      hasAtLeast: (requiredLevel) => requiredLevel === world.license,
    }),
    getActiveProduct: () => world.activeProduct,
    isServerless: world.isServerless,
    canSuggestVariables: () => world.supportsControls,
    getVariables: () => [...world.variables],
    getKqlSuggestions: world.getKqlSuggestions,
  };
};
