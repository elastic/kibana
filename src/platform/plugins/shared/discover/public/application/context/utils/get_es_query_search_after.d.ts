import type { estypes } from '@elastic/elasticsearch';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { SurrDocType } from '../services/context';
/**
 * Get the searchAfter query value for elasticsearch
 * When there are already documents available, which means successors or predecessors
 * were already fetched, the new searchAfter for the next fetch has to be the sort value
 * of the first (prececessor), or last (successor) of the list
 */
export declare function getEsQuerySearchAfter(type: SurrDocType, rows: DataTableRecord[], anchor: DataTableRecord): estypes.SortResults;
