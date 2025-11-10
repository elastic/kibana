/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type api from '@elastic/elasticsearch/lib/api/types';

import type { AnyMapping, Strict, StringMapping } from './types';

export type ObjectToPropertiesDefinition<O extends Record<string, unknown>> = {} extends O
  ? never
  : {
      [K in keyof O]?: {} extends O[K]
        ? never
        : O[K] extends Record<string, unknown>
        ? Omit<Strict<api.MappingObjectProperty>, 'properties'> & {
            type: 'object';
            properties: ObjectToPropertiesDefinition<O[K]>;
          }
        : O[K] extends string
        ? StringMapping
        : AnyMapping;
    };

export const createTypedMappings = <T extends Record<string, unknown>>(
  input: T
): ObjectToPropertiesDefinition<T> => {
  return input;
};
