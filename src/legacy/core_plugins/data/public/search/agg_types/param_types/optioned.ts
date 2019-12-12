/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { AggConfig } from 'ui/vis';
import { BaseParamType } from './base';

export interface OptionedValueProp {
  value: string;
  text: string;
  disabled?: boolean;
  isCompatible: (agg: AggConfig) => boolean;
}

export interface OptionedParamEditorProps<T = OptionedValueProp> {
  aggParam: {
    options: T[];
  };
}

export class OptionedParamType extends BaseParamType {
  options: OptionedValueProp[];

  constructor(config: Record<string, any>) {
    super(config);

    if (!config.write) {
      this.write = (aggConfig: AggConfig, output: Record<string, any>) => {
        output.params[this.name] = aggConfig.params[this.name].value;
      };
    }
    if (!config.serialize) {
      this.serialize = (selected: OptionedValueProp) => {
        return selected.value;
      };
    }
    if (!config.deserialize) {
      this.deserialize = (value: any) => {
        return this.options.find((option: OptionedValueProp) => option.value === value);
      };
    }
    this.options = config.options || [];
  }
}
