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
import type { HttpSetup, IUiSettingsClient } from '@kbn/core/public';
import { fromConnectorSpecSchema } from '@kbn/connector-specs/src/lib/deserialize_connector_spec';
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
  /** Re-runs the connector spec query (no-op when the model is from the registry) */
  refetch: () => void;
}

/**
 * Hook to get an ActionTypeModel for a given action type id.
 *
 * For stack connectors (registered in the actionTypeRegistry), returns the model synchronously.
 * For spec-based connectors, fetches the spec from the API and transforms it into an ActionTypeModel.
 *
 * Routing is driven by the registry: if the connector type is registered, the registry model is
 * used; if not, the spec endpoint is tried as a fallback.
 */
export function useActionTypeModel({
  actionTypeRegistry,
  actionTypeId,
  http,
  uiSettings,
}: {
  actionTypeRegistry: ActionTypeRegistryContract;
  actionTypeId: string | undefined;
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

  // Fetch the spec whenever the connector type is not in the registry. Stack connectors are
  // always registered; spec connectors never are. A 404 from the spec endpoint means the type
  // is unknown and we return null quietly (no error callout shown to the user).
  const shouldFetchSpec = !!actionTypeId && registeredModel === null;

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
    actionTypeModel: registeredModel ?? specBasedModel,
    isLoading: shouldFetchSpec && isLoading,
    error,
    refetch: () => {
      void refetch();
    },
  };
}
