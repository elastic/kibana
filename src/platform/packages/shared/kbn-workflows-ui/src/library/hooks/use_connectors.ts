/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import { fetchConnectors } from '@kbn/alerts-ui-shared/src/common/apis';
import type { HttpStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQuery, useQueryClient } from '@kbn/react-query';

const CONNECTORS_QUERY_KEY = ['workflows-library', 'connectors'];

/**
 * Fetches the user's action connectors of a given type (`actionTypeId`).
 *
 * All connector-typed install-form fields share one cached fetch of the full
 * connector list (react-query dedupes by key); each hook instance filters to
 * its own type. Use {@link useInvalidateConnectors} after creating a connector
 * so every open picker refreshes.
 */
export function useConnectors(connectorType: string) {
  const { http } = useKibana<{ http: HttpStart }>().services;

  return useQuery({
    queryKey: CONNECTORS_QUERY_KEY,
    queryFn: () => fetchConnectors({ http }),
    select: (connectors) =>
      connectors.filter((connector) => connector.actionTypeId === connectorType),
  });
}

/** Invalidates the shared connector-list cache (e.g. after creating a connector). */
export function useInvalidateConnectors() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries(CONNECTORS_QUERY_KEY), [queryClient]);
}
