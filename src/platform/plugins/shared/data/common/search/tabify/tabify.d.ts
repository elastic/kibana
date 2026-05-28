import type { Datatable } from '@kbn/expressions-plugin/common';
import type { TabbedResponseWriterOptions } from './types';
import type { IAggConfigs } from '../aggs';
/**
 * Sets up the ResponseWriter and kicks off bucket collection.
 */
export declare function tabifyAggResponse(aggConfigs: IAggConfigs, esResponse: Record<string, any>, respOpts?: Partial<TabbedResponseWriterOptions>): Datatable;
