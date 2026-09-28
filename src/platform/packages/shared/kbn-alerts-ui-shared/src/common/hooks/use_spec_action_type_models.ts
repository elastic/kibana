/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useQueries } from '@kbn/react-query';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { ActionType } from '@kbn/actions-types';
import type { DocLinksStart, HttpSetup, IUiSettingsClient } from '@kbn/core/public';
import type { ActionTypeModel, ActionTypeRegistryContract } from '../types';
import type { ConnectorSpecResponse } from '../utils/action_type_model_utils';
import {
  fetchConnectorSpec,
  transformSpecToActionTypeModel,
} from '../utils/action_type_model_utils';

const CONNECTOR_SPEC_QUERY_KEY = 'connectorSpec';

export function useSpecActionTypeModels({
  http,
  docLinks,
  uiSettings,
  actionTypeRegistry,
  connectorTypes,
  enabled = true,
}: {
  http: HttpSetup;
  docLinks: DocLinksStart;
  uiSettings?: IUiSettingsClient;
  actionTypeRegistry: ActionTypeRegistryContract;
  connectorTypes: ActionType[];
  enabled?: boolean;
}): { models: ActionTypeModel[]; isLoading: boolean; isInitialLoading: boolean } {
  const specTypeIds = useMemo(
    () =>
      connectorTypes
        .filter(
          (actionType) =>
            actionType.source === ACTION_TYPE_SOURCES.spec && !actionTypeRegistry.has(actionType.id)
        )
        .map((actionType) => actionType.id),
    [actionTypeRegistry, connectorTypes]
  );

  const shouldFetch = enabled && specTypeIds.length > 0;

  const results = useQueries({
    queries: specTypeIds.map((id) => ({
      queryKey: [CONNECTOR_SPEC_QUERY_KEY, id],
      queryFn: async ({ signal }: { signal?: AbortSignal }) => fetchConnectorSpec(http, id, signal),
      enabled: shouldFetch,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: false,
    })),
  });

  const models = useMemo(() => {
    const next: ActionTypeModel[] = [];
    for (const result of results) {
      if (!result.isSuccess || !result.data) {
        continue;
      }
      next.push(
        transformSpecToActionTypeModel(result.data as ConnectorSpecResponse, docLinks, uiSettings)
      );
    }
    return next;
  }, [docLinks, results, uiSettings]);

  if (!shouldFetch) {
    return { models: [], isLoading: false, isInitialLoading: false };
  }

  return {
    models,
    isLoading: results.some((result) => result.isLoading),
    isInitialLoading: results.some((result) => result.isInitialLoading),
  };
}
