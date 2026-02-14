/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IAggConfig } from '../agg_config';
import type { AggParamOutput } from './base';
import { BaseParamType } from './base';

export interface OptionedValueProp {
  value: string;
  text: string;
  disabled?: boolean;
  isCompatible: (agg: IAggConfig) => boolean;
}

export class OptionedParamType extends BaseParamType {
  options: OptionedValueProp[];

  constructor(config: Record<string, unknown>) {
    super(config);

    if (!config.write) {
      this.write = (aggConfig: IAggConfig, output: AggParamOutput) => {
        output.params[this.name] = (aggConfig.params[this.name] as OptionedValueProp).value;
      };
    }
    if (!config.serialize) {
      this.serialize = (selected: unknown) => {
        return (selected as OptionedValueProp).value;
      };
    }
    if (!config.deserialize) {
      this.deserialize = (value: unknown) => {
        return this.options.find((option: OptionedValueProp) => option.value === value);
      };
    }
    this.options = (config.options as OptionedValueProp[]) || [];
  }
}
