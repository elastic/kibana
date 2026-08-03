import { type Context } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { QueryClient } from '@kbn/react-query';
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
export declare const useAlertFieldNames: ({ http, ruleTypeIds, enabled, context, }: UseAlertFieldNamesParams) => UseAlertFieldNamesResult;
