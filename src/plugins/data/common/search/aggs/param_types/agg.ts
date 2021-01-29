/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { AggConfig, IAggConfig, AggConfigSerialized } from '../agg_config';
import { BaseParamType } from './base';

export class AggParamType<
  TAggConfig extends IAggConfig = IAggConfig
> extends BaseParamType<TAggConfig> {
  makeAgg: (agg: TAggConfig, state?: AggConfigSerialized) => TAggConfig;
  allowedAggs: string[] = [];

  constructor(config: Record<string, any>) {
    super(config);

    if (config.allowedAggs) {
      this.allowedAggs = config.allowedAggs;
    }

    if (!config.write) {
      this.write = (aggConfig: TAggConfig, output: Record<string, any>) => {
        if (aggConfig.params[this.name] && aggConfig.params[this.name].length) {
          output.params[this.name] = aggConfig.params[this.name];
        }
      };
    }
    if (!config.serialize) {
      this.serialize = (agg: TAggConfig) => {
        return agg.serialize();
      };
    }
    if (!config.deserialize) {
      this.deserialize = (state: AggConfigSerialized, agg?: TAggConfig): TAggConfig => {
        if (!agg) {
          throw new Error('aggConfig was not provided to AggParamType deserialize function');
        }
        return this.makeAgg(agg, state);
      };
    }
    if (!config.toExpressionAst) {
      this.toExpressionAst = (agg: TAggConfig) => {
        if (!agg || !agg.toExpressionAst) {
          throw new Error('aggConfig was not provided to AggParamType toExpressionAst function');
        }
        return agg.toExpressionAst();
      };
    }

    this.makeAgg = config.makeAgg;
    this.valueType = AggConfig;
  }
}
