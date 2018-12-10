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

import { schema } from '@kbn/config-schema';

import { assertNever } from '../../../utils';
import { LogRecord } from '../log_record';
import { JsonLayout, JsonLayoutConfigType } from './json_layout';
import { PatternLayout, PatternLayoutConfigType } from './pattern_layout';

const { oneOf } = schema;

type LayoutConfigType = PatternLayoutConfigType | JsonLayoutConfigType;

/**
 * Entity that can format `LogRecord` instance into a string.
 * @internal
 */
export interface Layout {
  format(record: LogRecord): string;
}

/** @internal */
export class Layouts {
  public static configSchema = oneOf([JsonLayout.configSchema, PatternLayout.configSchema]);

  /**
   * Factory method that creates specific `Layout` instances based on the passed `config` parameter.
   * @param config Configuration specific to a particular `Layout` implementation.
   * @returns Fully constructed `Layout` instance.
   */
  public static create(config: LayoutConfigType): Layout {
    switch (config.kind) {
      case 'json':
        return new JsonLayout();

      case 'pattern':
        return new PatternLayout(config.pattern, config.highlight);

      default:
        return assertNever(config);
    }
  }
}
