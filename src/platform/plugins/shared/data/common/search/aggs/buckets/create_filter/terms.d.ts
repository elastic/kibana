import type { Filter } from '@kbn/es-query';
import type { IBucketAggConfig } from '../bucket_agg_type';
export declare const createFilterTerms: (aggConfig: IBucketAggConfig, key: string, params: any) => Filter[] | import("@kbn/es-query").PhraseFilter | import("@kbn/es-query").ExistsFilter | import("@kbn/es-query").ScriptedPhraseFilter;
