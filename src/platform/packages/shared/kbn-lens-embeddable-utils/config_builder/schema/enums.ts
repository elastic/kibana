/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

interface Options<T extends string> {
  defaultValue?: T;
  meta?: { description: string };
}

function withDefaults<T extends string>(
  opts?: Options<T>,
  defaults: { defaultValue?: T; description?: string } = {}
): Options<T> {
  return {
    ...opts,
    defaultValue: opts && 'defaultValue' in opts ? opts.defaultValue : defaults.defaultValue,
    meta: {
      description: opts?.meta?.description ?? defaults.description ?? '',
      ...opts?.meta,
    },
  };
}

class BuilderEnums {
  orientation = (opts?: Options<'horizontal' | 'vertical' | 'angled'>) =>
    schema.oneOf(
      [schema.literal('horizontal'), schema.literal('vertical'), schema.literal('angled')],
      withDefaults(opts, {
        description: 'Orientation',
      })
    );
}

/**
 * Helper utility to create commonly used enum schemas with defaults
 */
export const builderEnums = new BuilderEnums();
