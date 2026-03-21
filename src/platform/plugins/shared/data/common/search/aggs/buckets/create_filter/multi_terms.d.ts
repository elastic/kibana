import type { Filter } from '@kbn/es-query';
import type { IBucketAggConfig } from '../bucket_agg_type';
import type { MultiFieldKey } from '../multi_field_key';
export declare const createFilterMultiTerms: (aggConfig: IBucketAggConfig, key: MultiFieldKey, params: {
    terms: MultiFieldKey[];
}) => Filter;
