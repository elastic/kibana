/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { ActionType } from '@kbn/actions-types';
import { fromConnectorSpecSchema } from '@kbn/connector-specs/src/lib/deserialize_connector_spec';
import type { HttpSetup, IUiSettingsClient } from '@kbn/core/public';
import type { ActionTypeModel, ActionTypeRegistryContract } from '../types';
import {
  fetchConnectorSpec,
  transformSpecToActionTypeModel,
} from '../utils/action_type_model_utils';

const CONNECTOR_SPEC_QUERY_KEY = 'connectorSpec';

export interface UseActionTypeModelResult {
  /** The action type model, either from registry or derived from spec */
  actionTypeModel: ActionTypeModel | null;
  /** Whether the spec is currently being fetched */
  isLoading: boolean;
  /** Error if fetching the spec failed */
  error: Error | null;
  /** Whether the model was derived from a spec (vs from registry) */
  isFromSpec: boolean;
  /** Re-runs the connector spec query (no-op when the model is from the registry) */
  refetch: () => void;
}

/**
 * Hook to get an ActionTypeModel for a given ActionType.
 *
 * For stack connectors (registered in the actionTypeRegistry), returns the model synchronously.
 * For spec-based connectors, fetches the spec from the API and transforms it into an ActionTypeModel.
 */
export function useActionTypeModel({
  actionTypeRegistry,
  actionType,
  http,
  uiSettings,
}: {
  actionTypeRegistry: ActionTypeRegistryContract;
  actionType: ActionType | null;
  http: HttpSetup;
  uiSettings?: IUiSettingsClient;
}): UseActionTypeModelResult {
  const registeredModel = useMemo(() => {
    if (actionType == null) {
      return null;
    }
    if (actionTypeRegistry.has(actionType.id)) {
      return actionTypeRegistry.get(actionType.id);
    }
    return null;
  }, [actionType, actionTypeRegistry]);

  const shouldFetchSpec = actionType != null && actionType.source === ACTION_TYPE_SOURCES.spec;

  const {
    data: specData,
    isLoading,
    error,
    refetch,
  } = useQuery<Awaited<ReturnType<typeof fetchConnectorSpec>>, Error>({
    queryKey: [CONNECTOR_SPEC_QUERY_KEY, actionType?.id],
    queryFn: async ({ signal }) => {
      const spec = await fetchConnectorSpec(http, actionType!.id, signal);
      // Validate eagerly — fail fast before caching. The schema is re-parsed
      // lazily inside actionConnectorFields when the form component mounts.
      if (!fromConnectorSpecSchema(spec.schema)) {
        throw new Error(`Failed to parse connector spec schema for "${actionType!.id}"`);
      }
      return spec;
    },
    enabled: shouldFetchSpec,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const specBasedModel = useMemo(() => {
    if (!specData) {
      return null;
    }
    return transformSpecToActionTypeModel(specData, uiSettings);
  }, [specData, uiSettings]);

  return {
    actionTypeModel: shouldFetchSpec ? specBasedModel : registeredModel,
    isLoading: shouldFetchSpec && isLoading,
    error,
    isFromSpec: shouldFetchSpec && specBasedModel != null,
    refetch: () => {
      void refetch();
    },
  };
}
