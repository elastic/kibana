/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { settings } from '../../../commands/definitions/generated/settings';
import { parseMapParams } from '../../../commands/definitions/utils/maps';
import {
  METADATA_FIELD_NAMES,
  SERVERLESS_METADATA_FIELD_NAMES,
  type EntityItem,
} from '../../../esql_js_sim/definitions';
import type { EntityRegistry } from './types';

/**
 * How each kind of entity is listed, from what the editor provides today. Each definition
 * turns the answer of a callback into entities and applies the scope; none knows a command.
 */
export const ENTITIES: EntityRegistry = {
  source: {
    fetch: async (callbacks, { indexMode }) => {
      if (indexMode === 'time_series') {
        const { indices = [] } = (await callbacks.getTimeseriesIndices?.()) ?? {};

        return indices.map(({ name, aliases, mode }) => ({ name, aliases, category: mode }));
      }

      const [sources = [], views, datasets] = await Promise.all([
        callbacks.getSources?.(),
        callbacks.getViews?.(),
        callbacks.getDatasets?.(),
      ]);

      return [
        ...sources.map(
          ({ name, hidden, type, title, description, dataStreams }): EntityItem => ({
            name,
            hidden,
            category: type,
            description: description ?? title,
            hasChildren: Boolean(dataStreams?.length),
          })
        ),
        ...(views?.views ?? []).map(({ name, description }) => ({
          name,
          description,
          category: 'View',
        })),
        ...(datasets?.datasets ?? []).map(({ name, description }) => ({
          name,
          description,
          category: 'Dataset',
        })),
      ];
    },
  },

  lookup_index: {
    fetch: async (callbacks) => {
      const { indices = [] } = (await callbacks.getJoinIndices?.()) ?? {};

      return indices.map(({ name, aliases, mode }) => ({ name, aliases, category: mode }));
    },
    exists: (name, items) =>
      items.some((item) => item.name === name || item.aliases?.includes(name)),
  },

  enrich_policy: {
    fetch: async (callbacks) =>
      ((await callbacks.getPolicies?.()) ?? []).map(({ name, sourceIndices }) => ({
        name,
        description: sourceIndices.join(', '),
      })),
  },

  enrich_field: {
    fetch: async (callbacks, { parent }) => {
      const policies = (await callbacks.getPolicies?.()) ?? [];

      return (policies.find(({ name }) => name === parent)?.enrichFields ?? []).map((name) => ({
        name,
      }));
    },
  },

  inference_endpoint: {
    fetch: async (callbacks, { taskType }) => {
      if (!taskType) {
        return [];
      }

      const { inferenceEndpoints = [] } = (await callbacks.getInferenceEndpoints?.(taskType)) ?? {};

      return inferenceEndpoints.map(({ inference_id: name, task_type: category }) => ({
        name,
        category,
      }));
    },
  },

  metadata_field: {
    fetch: async (_callbacks, { isServerless }) =>
      [...METADATA_FIELD_NAMES, ...(isServerless ? SERVERLESS_METADATA_FIELD_NAMES : [])].map(
        (name) => ({ name })
      ),
  },

  setting: {
    fetch: async (_callbacks, { isServerless }) =>
      settings
        .filter(({ serverlessOnly }) => isServerless || !serverlessOnly)
        .map(({ name, ignoreAsSuggestion, description }) => ({
          name,
          hidden: ignoreAsSuggestion,
          description,
        })),
    valueRoles: (name) => {
      const setting = settings.find((candidate) => candidate.name === name);
      const types: readonly string[] = setting?.type ?? [];
      const { mapParams } = (setting ?? {}) as { mapParams?: string };

      return [
        ...(types.includes('boolean')
          ? [{ kind: 'constant', valueType: 'boolean', allowedValues: ['false', 'true'] } as const]
          : []),
        ...(mapParams
          ? [
              {
                kind: 'map',
                parameters: Object.fromEntries(
                  Object.entries(parseMapParams(mapParams)).map(([key, { rawType, values }]) => [
                    key,
                    { type: rawType, ...(values.length && { values }) },
                  ])
                ),
              } as const,
            ]
          : []),
      ];
    },
  },
};
