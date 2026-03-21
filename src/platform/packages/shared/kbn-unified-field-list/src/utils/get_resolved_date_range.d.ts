import { type TimefilterContract } from '@kbn/data-plugin/public';
/**
 * Get resolved time range by using now provider
 * @param timefilter
 */
export declare const getResolvedDateRange: (timefilter: TimefilterContract) => {
    fromDate: string;
    toDate: string;
};
