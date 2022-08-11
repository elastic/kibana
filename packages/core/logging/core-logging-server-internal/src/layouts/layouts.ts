/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { Layout } from '@kbn/logging';
import { assertNever } from '@kbn/std';
import type { LayoutConfigType } from '@kbn/core-logging-server';

import { JsonLayout } from './json_layout';
import { PatternLayout } from './pattern_layout';

const { oneOf } = schema;

/** @internal */
export class Layouts {
  public static configSchema = oneOf([JsonLayout.configSchema, PatternLayout.configSchema]);

  /**
   * Factory method that creates specific `Layout` instances based on the passed `config` parameter.
   * @param config Configuration specific to a particular `Layout` implementation.
   * @returns Fully constructed `Layout` instance.
   */
  public static create(config: LayoutConfigType): Layout {
    switch (config.type) {
      case 'json':
        return new JsonLayout();

      case 'pattern':
        return new PatternLayout(config.pattern, config.highlight);

      default:
        return assertNever(config);
    }
  }
}
