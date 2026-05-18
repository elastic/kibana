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
  type ConnectorSpecResponse,
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
 * Hook to get an ActionTypeModel for a given action type id and source.
 *
 * For stack connectors (registered in the actionTypeRegistry), returns the model synchronously.
 * For spec-based connectors, fetches the spec from the API and transforms it into an ActionTypeModel.
 */
export function useActionTypeModel({
  actionTypeRegistry,
  actionTypeId,
  source,
  http,
  uiSettings,
}: {
  actionTypeRegistry: ActionTypeRegistryContract;
  actionTypeId: string | undefined;
  source?: ActionTypeSource;
  http: HttpSetup;
  uiSettings?: IUiSettingsClient;
}): UseActionTypeModelResult {
  const registeredModel = useMemo(() => {
    if (!actionTypeId) {
      return null;
    }
    if (actionTypeRegistry.has(actionTypeId)) {
      return actionTypeRegistry.get(actionTypeId);
    }
    return null;
  }, [actionTypeId, actionTypeRegistry]);

  const shouldFetchSpec = !!actionTypeId && source === ACTION_TYPE_SOURCES.spec;

  const {
    data = null,
    isLoading,
    error,
    refetch,
  } = useQuery<ConnectorSpecResponse, Error>({
    queryKey: [CONNECTOR_SPEC_QUERY_KEY, actionTypeId],
    queryFn: async ({ signal }) => {
      const spec = await fetchConnectorSpec(http, actionTypeId!, signal);
      // Validate eagerly — fail fast before caching. The schema is re-parsed
      // lazily inside actionConnectorFields when the form component mounts.
      if (!fromConnectorSpecSchema(spec.schema)) {
        throw new Error(`Failed to parse connector spec schema for "${actionTypeId}"`);
      }
      return spec;
    },
    enabled: shouldFetchSpec,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // transformSpecToActionTypeModel calls lazy() internally, producing new object references on
  // every invocation. Memoizing on data keeps the ActionTypeModel reference stable between
  // renders, preventing infinite re-render loops in React Query (which re-runs select when its
  // function reference changes).
  const specBasedModel = useMemo(
    () => (data ? transformSpecToActionTypeModel(data, uiSettings) : null),
    [data, uiSettings]
  );

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
