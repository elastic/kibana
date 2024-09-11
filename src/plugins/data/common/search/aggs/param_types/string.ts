/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IAggConfig } from '../agg_config';
import { BaseParamType } from './base';

export class StringParamType extends BaseParamType {
  constructor(config: Record<string, any>) {
    super(config);

    if (!config.write) {
      this.write = (aggConfig: IAggConfig, output: Record<string, any>) => {
        if (aggConfig.params[this.name] && aggConfig.params[this.name].length) {
          output.params[this.name] = aggConfig.params[this.name];
        }
      };
    }
  }
}
