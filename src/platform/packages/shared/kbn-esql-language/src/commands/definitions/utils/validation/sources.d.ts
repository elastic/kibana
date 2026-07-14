import type { ESQLSource } from '@elastic/esql/types';
import type { ICommandContext } from '../../../registry/types';
import type { ESQLMessage } from '../../types';
/**
 * Returns true when every comma-separated part of `sourceName` starts with a dot.
 * Covers backing indices like `.ds-logs-default-000001` that are hidden in Elasticsearch
 * but are never surfaced as individual entries in the sources list.
 */
export declare function isDotPrefixedSource(sourceName: string): boolean;
export interface ValidateSourcesOptions {
    /** When true, use "Unknown data source" error (e.g. for FROM). When false, use "Unknown index" (e.g. for TS). */
    useGenericDataSourceError?: boolean;
}
export declare function validateSources(sources: ESQLSource[], context?: ICommandContext, options?: ValidateSourcesOptions): ESQLMessage[];
