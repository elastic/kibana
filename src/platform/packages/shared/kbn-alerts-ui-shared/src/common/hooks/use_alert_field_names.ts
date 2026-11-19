/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, type Context } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { QueryClient } from '@kbn/react-query';
import { useFetchAlertsFieldsQuery } from './use_fetch_alerts_fields_query';
import { toLeafScalarFieldNames } from '../utils/to_leaf_scalar_field_names';

export interface UseAlertFieldNamesParams {
  http: HttpStart;
  ruleTypeIds: string[];
  enabled?: boolean;
  /**
   * React-query context to resolve the `QueryClient` against. Consumers that
   * scope their client to a custom context must pass it. When omitted, the query
   * resolves against the default `QueryClient`.
   */
  context?: Context<QueryClient | undefined>;
}

export interface UseAlertFieldNamesResult {
  fieldNames: string[];
  isLoading: boolean;
}

/**
 * Fetches the alert index fields for the given rule type ids and exposes them
 * as leaf-level scalar field names (the only paths that can be reliably
 * snapshotted from a single alert document — see {@link toLeafScalarFieldNames}).
 * The fetch is react-query cached/deduped by `ruleTypeIds`.
 */
export const useAlertFieldNames = ({
  http,
  ruleTypeIds,
  enabled = true,
  context,
}: UseAlertFieldNamesParams): UseAlertFieldNamesResult => {
  const { data, isLoading } = useFetchAlertsFieldsQuery(
    { http, ruleTypeIds },
    { enabled: enabled && ruleTypeIds.length > 0, context }
  );

  const fieldNames = useMemo(() => toLeafScalarFieldNames(data?.fields ?? []), [data?.fields]);

  return { fieldNames, isLoading };
};
