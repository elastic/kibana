import type { IAggConfig, AggConfigSerialized } from '../agg_config';
import { BaseParamType } from './base';
export declare class AggParamType<TAggConfig extends IAggConfig = IAggConfig> extends BaseParamType<TAggConfig> {
    makeAgg: (agg: TAggConfig, state?: AggConfigSerialized) => TAggConfig;
    allowedAggs: string[];
    constructor(config: Record<string, any>);
}
