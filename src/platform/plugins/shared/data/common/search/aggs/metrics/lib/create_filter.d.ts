import type { AggConfig } from '../../agg_config';
import type { IMetricAggConfig } from '../metric_agg_type';
export declare const createMetricFilter: <TMetricAggConfig extends AggConfig = IMetricAggConfig>(aggConfig: TMetricAggConfig, key: string) => import("@kbn/es-query").ExistsFilter | undefined;
export declare const createTopHitFilter: <TMetricAggConfig extends AggConfig = IMetricAggConfig>(aggConfig: TMetricAggConfig, key: string) => import("@kbn/es-query").PhraseFilter | import("@kbn/es-query").ScriptedPhraseFilter | import("@kbn/es-query").CombinedFilter | undefined;
