/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { Layout } from '@kbn/logging';
import { assertNever } from '@kbn/std';

import { JsonLayout, JsonLayoutConfigType } from './json_layout';
import { PatternLayout, PatternLayoutConfigType } from './pattern_layout';

const { oneOf } = schema;

export type LayoutConfigType = PatternLayoutConfigType | JsonLayoutConfigType;

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
