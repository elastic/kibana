/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Layout } from '@kbn/logging';
import type { LayoutConfigType } from '@kbn/core-logging-server';
/** @internal */
export declare class Layouts {
  static configSchema: import('@kbn/config-schema').Type<
    | Readonly<
        {} & {
          type: 'json';
        }
      >
    | Readonly<
        {
          highlight?: boolean | undefined;
          pattern?: string | undefined;
        } & {
          type: 'pattern';
        }
      >
  >;
  /**
   * Factory method that creates specific `Layout` instances based on the passed `config` parameter.
   * @param config Configuration specific to a particular `Layout` implementation.
   * @returns Fully constructed `Layout` instance.
   */
  static create(config: LayoutConfigType): Layout;
}
