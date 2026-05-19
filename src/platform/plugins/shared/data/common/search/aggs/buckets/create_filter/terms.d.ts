import type { Filter } from '@kbn/es-query';
import type { IBucketAggConfig } from '../bucket_agg_type';
export declare const createFilterTerms: (aggConfig: IBucketAggConfig, key: string, params: any) => import("@kbn/es-query").ExistsFilter | Filter[] | import("@kbn/es-query").PhraseFilter | import("@kbn/es-query").ScriptedPhraseFilter;
