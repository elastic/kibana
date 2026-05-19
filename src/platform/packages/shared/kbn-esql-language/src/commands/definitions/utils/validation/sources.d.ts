import type { ESQLSource } from '@elastic/esql/types';
import type { ICommandContext } from '../../../registry/types';
import type { ESQLMessage } from '../../types';
export interface ValidateSourcesOptions {
    /** When true, use "Unknown data source" error (e.g. for FROM). When false, use "Unknown index" (e.g. for TS). */
    useGenericDataSourceError?: boolean;
}
export declare function validateSources(sources: ESQLSource[], context?: ICommandContext, options?: ValidateSourcesOptions): ESQLMessage[];
