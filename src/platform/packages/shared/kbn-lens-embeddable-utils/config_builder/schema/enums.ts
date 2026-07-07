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
  meta?: {
    id?: string;
    description?: string;
  };
}

function withDefaults<T extends string>(
  opts?: Options<T>,
  defaults: { defaultValue?: T; id?: string; description?: string } = {}
): Options<T> {
  return {
    ...opts,
    defaultValue: opts && 'defaultValue' in opts ? opts.defaultValue : defaults.defaultValue,
    meta: {
      id: opts?.meta?.id ?? defaults.id ?? '',
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
        id: 'vis_api_orientation',
        description: 'Orientation',
      })
    );
  simpleOrientation = (opts?: Options<'horizontal' | 'vertical'>) =>
    schema.oneOf(
      [schema.literal('horizontal'), schema.literal('vertical')],
      withDefaults(opts, {
        id: 'vis_api_simple_orientation',
        description: 'Orientation',
      })
    );
  direction = (opts?: Options<'asc' | 'desc'>) =>
    schema.oneOf(
      [schema.literal('asc'), schema.literal('desc')],
      withDefaults(opts, {
        id: 'vis_api_direction',
        description: 'Direction',
      })
    );
}

/**
 * Helper utility to create commonly used enum schemas with defaults
 */
export const builderEnums = new BuilderEnums();
