import { type KueryNode } from '@kbn/es-query';
import type { UsageCountersSearchFilters } from '../types';
export declare function usageCountersSearchParamsToKueryFilter(params: Omit<UsageCountersSearchFilters, 'namespace'>): KueryNode;
