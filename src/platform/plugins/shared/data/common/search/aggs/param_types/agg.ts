/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IAggConfig, AggConfigSerialized } from '../agg_config';
import { AggConfig } from '../agg_config';
import { BaseParamType } from './base';
import type { AggParamOutput } from './base';

export class AggParamType<
  TAggConfig extends IAggConfig = IAggConfig
> extends BaseParamType<TAggConfig> {
  makeAgg: (agg: TAggConfig, state?: AggConfigSerialized) => TAggConfig;
  allowedAggs: string[] = [];

  constructor(config: Record<string, unknown>) {
    super(config);

    if (config.allowedAggs) {
      this.allowedAggs = config.allowedAggs as string[];
    }

    if (!config.write) {
      this.write = (aggConfig: TAggConfig, output: AggParamOutput) => {
        if (aggConfig.params[this.name] && aggConfig.params[this.name].length) {
          output.params[this.name] = aggConfig.params[this.name];
        }
      };
    }
    if (!config.serialize) {
      this.serialize = (value: unknown) => {
        return (value as TAggConfig).serialize();
      };
    }
    if (!config.deserialize) {
      this.deserialize = (state: unknown, agg?: TAggConfig): TAggConfig => {
        if (!agg) {
          throw new Error('aggConfig was not provided to AggParamType deserialize function');
        }
        return this.makeAgg(agg, state as AggConfigSerialized);
      };
    }
    if (!config.toExpressionAst) {
      this.toExpressionAst = (value: unknown) => {
        const agg = value as TAggConfig;
        if (!agg || !agg.toExpressionAst) {
          throw new Error('aggConfig was not provided to AggParamType toExpressionAst function');
        }
        return agg.toExpressionAst();
      };
    }

    this.makeAgg = config.makeAgg as typeof this.makeAgg;
    this.getValueType = () => AggConfig;
  }
}
