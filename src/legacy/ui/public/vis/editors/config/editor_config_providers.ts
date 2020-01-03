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

import { TimeIntervalParam } from 'ui/vis/editors/config/types';
import { AggConfig } from '../..';
import { AggType } from '../../../agg_types';
import { IndexPattern } from '../../../../../../plugins/data/public';
import { leastCommonMultiple } from '../../lib/least_common_multiple';
import { parseEsInterval } from '../../../../../core_plugins/data/public';
import { leastCommonInterval } from '../../lib/least_common_interval';
import { EditorConfig, EditorParamConfig, FixedParam, NumericIntervalParam } from './types';

type EditorConfigProvider = (
  aggType: AggType,
  indexPattern: IndexPattern,
  aggConfig: AggConfig
) => EditorConfig;

class EditorConfigProviderRegistry {
  private providers: Set<EditorConfigProvider> = new Set();

  public register(configProvider: EditorConfigProvider): void {
    this.providers.add(configProvider);
  }

  public getConfigForAgg(
    aggType: AggType,
    indexPattern: IndexPattern,
    aggConfig: AggConfig
  ): EditorConfig {
    const configs = Array.from(this.providers).map(provider =>
      provider(aggType, indexPattern, aggConfig)
    );
    return this.mergeConfigs(configs);
  }

  private isTimeBaseParam(config: EditorParamConfig): config is TimeIntervalParam {
    return config.hasOwnProperty('default') && config.hasOwnProperty('timeBase');
  }

  private isBaseParam(config: EditorParamConfig): config is NumericIntervalParam {
    return config.hasOwnProperty('base');
  }

  private isFixedParam(config: EditorParamConfig): config is FixedParam {
    return config.hasOwnProperty('fixedValue');
  }

  private mergeHidden(current: EditorParamConfig, merged: EditorParamConfig): boolean {
    return Boolean(current.hidden || merged.hidden);
  }

  private mergeHelp(current: EditorParamConfig, merged: EditorParamConfig): string | undefined {
    if (!current.help) {
      return merged.help;
    }

    return merged.help ? `${merged.help}\n\n${current.help}` : current.help;
  }

  private mergeFixedAndBase(
    current: EditorParamConfig,
    merged: EditorParamConfig,
    paramName: string
  ): { fixedValue: unknown } | { base: number } | {} {
    if (
      this.isFixedParam(current) &&
      this.isFixedParam(merged) &&
      current.fixedValue !== merged.fixedValue
    ) {
      // In case multiple configurations provided a fixedValue, these must all be the same.
      // If not we'll throw an error.
      throw new Error(`Two EditorConfigProviders provided different fixed values for field ${paramName}:
          ${merged.fixedValue} !== ${current.fixedValue}`);
    }

    if (
      (this.isFixedParam(current) && this.isBaseParam(merged)) ||
      (this.isBaseParam(current) && this.isFixedParam(merged))
    ) {
      // In case one config tries to set a fixed value and another setting a base value,
      // we'll throw an error. This could be solved more elegantly, by allowing fixedValues
      // that are the multiple of the specific base value, but since there is no use-case for that
      // right now, this isn't implemented.
      throw new Error(`Tried to provide a fixedValue and a base for param ${paramName}.`);
    }

    if (this.isBaseParam(current) && this.isBaseParam(merged)) {
      // In case where both had interval values, just use the least common multiple between both interval
      return {
        base: leastCommonMultiple(current.base, merged.base),
      };
    }

    // In this case we haven't had a fixed value of base for that param yet, we use the one specified
    // in the current config
    if (this.isFixedParam(current)) {
      return {
        fixedValue: current.fixedValue,
      };
    }
    if (this.isBaseParam(current)) {
      return {
        base: current.base,
      };
    }

    return {};
  }

  private mergeTimeBase(
    current: TimeIntervalParam,
    merged: EditorParamConfig,
    paramName: string
  ): { timeBase: string; default: string } {
    if (current.default !== current.timeBase) {
      throw new Error(`Tried to provide differing default and timeBase values for ${paramName}.`);
    }

    if (this.isTimeBaseParam(merged)) {
      // In case both had where interval values, just use the least common multiple between both intervals
      const timeBase = leastCommonInterval(current.timeBase, merged.timeBase);
      return {
        default: timeBase,
        timeBase,
      };
    }

    // This code is simply here to throw an error in case the `timeBase` is not a valid ES interval
    parseEsInterval(current.timeBase);
    return {
      default: current.timeBase,
      timeBase: current.timeBase,
    };
  }

  private mergeConfigs(configs: EditorConfig[]): EditorConfig {
    return configs.reduce((output, conf) => {
      Object.entries(conf).forEach(([paramName, paramConfig]) => {
        if (!output[paramName]) {
          output[paramName] = {};
        }

        output[paramName] = {
          hidden: this.mergeHidden(paramConfig, output[paramName]),
          help: this.mergeHelp(paramConfig, output[paramName]),
          ...(this.isTimeBaseParam(paramConfig)
            ? this.mergeTimeBase(paramConfig, output[paramName], paramName)
            : this.mergeFixedAndBase(paramConfig, output[paramName], paramName)),
        };
      });
      return output;
    }, {});
  }
}

const editorConfigProviders = new EditorConfigProviderRegistry();

export { editorConfigProviders, EditorConfigProviderRegistry };
