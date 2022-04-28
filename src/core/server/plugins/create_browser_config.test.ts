/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PluginConfigDescriptor } from './types';
import { createBrowserConfig } from './create_browser_config';
import { schema, TypeOf } from '@kbn/config-schema';

describe('createBrowserConfig', () => {
  it('picks nothing by default', () => {
    const configSchema = schema.object({
      notExposed1: schema.string(),
      nested: schema.object({
        notExposed2: schema.boolean(),
        notExposed3: schema.maybe(schema.number()),
      }),
    });
    const config = {
      notExposed1: '1',
      nested: {
        notExposed2: true,
        notExposed3: 3,
      },
    };
    const descriptor: PluginConfigDescriptor<TypeOf<typeof configSchema>> = {
      schema: configSchema,
    };

    const result = createBrowserConfig(config, descriptor);
    expect(result).toEqual({ browserConfig: {}, exposedConfigKeys: {} });
  });

  it('picks all the nested properties when using `true`', () => {
    const configSchema = schema.object({
      exposed1: schema.string(),
      nested: schema.object({
        exposed2: schema.boolean(),
        exposed3: schema.maybe(schema.number()),
      }),
      notExposed4: schema.string(),
    });
    const config = {
      exposed1: '1',
      nested: {
        exposed2: true,
        exposed3: 3,
      },
      notExposed4: '4',
    };
    const descriptor: PluginConfigDescriptor<TypeOf<typeof configSchema>> = {
      schema: configSchema,
      exposeToBrowser: {
        exposed1: true,
        nested: true,
      },
    };

    const result = createBrowserConfig(config, descriptor);
    expect(result).toEqual({
      browserConfig: {
        exposed1: '1',
        nested: { exposed2: true, exposed3: 3 },
        // notExposed4 is not present
      },
      exposedConfigKeys: {
        exposed1: 'string',
        'nested.exposed2': 'boolean',
        'nested.exposed3': 'number',
        // notExposed4 is not present
      },
    });
  });

  it('picks specific nested properties, omitting those which are not specified', () => {
    const configSchema = schema.object({
      exposed1: schema.string(),
      nested: schema.object({
        exposed2: schema.boolean(),
        notExposed3: schema.maybe(schema.number()),
      }),
      notExposed4: schema.string(),
    });
    const config = {
      exposed1: '1',
      nested: {
        exposed2: true,
        notExposed3: 3,
      },
      notExposed4: '4',
    };
    const descriptor: PluginConfigDescriptor<TypeOf<typeof configSchema>> = {
      schema: configSchema,
      exposeToBrowser: {
        exposed1: true,
        nested: { exposed2: true },
      },
    };

    const result = createBrowserConfig(config, descriptor);
    expect(result).toEqual({
      browserConfig: {
        exposed1: '1',
        nested: { exposed2: true },
        // notExposed3 and notExposed4 are not present
      },
      exposedConfigKeys: {
        exposed1: 'string',
        'nested.exposed2': 'boolean',
        // notExposed3 and notExposed4 are not present
      },
    });
  });

  it('picks specific deeply nested properties, omitting those which are not specified', () => {
    const configSchema = schema.object({
      exposed1: schema.string(),
      deeply: schema.object({
        exposed2: schema.boolean(),
        nested: schema.object({
          exposed3: schema.maybe(schema.number()),
          structure: schema.object({
            exposed4: schema.string(),
            notExposed5: schema.string(),
          }),
          notExposed6: schema.string(),
        }),
        notExposed7: schema.string(),
      }),
      notExposed8: schema.string(),
    });
    const config = {
      exposed1: '1',
      deeply: {
        exposed2: true,
        nested: {
          exposed3: 3,
          structure: {
            exposed4: '4',
            notExposed5: '5',
          },
          notExposed6: '6',
        },
        notExposed7: '7',
      },
      notExposed8: '8',
    };
    const descriptor: PluginConfigDescriptor<TypeOf<typeof configSchema>> = {
      schema: configSchema,
      exposeToBrowser: {
        exposed1: true,
        deeply: {
          exposed2: true,
          nested: {
            exposed3: true,
            structure: {
              exposed4: true,
            },
          },
        },
      },
    };

    const result = createBrowserConfig(config, descriptor);
    expect(result).toEqual({
      browserConfig: {
        exposed1: '1',
        deeply: {
          exposed2: true,
          nested: {
            exposed3: 3,
            structure: {
              exposed4: '4',
            },
          },
        },
        // notExposed5, notExposed6, notExposed7, and notExposed8 are not present
      },
      exposedConfigKeys: {
        exposed1: 'string',
        'deeply.exposed2': 'boolean',
        'deeply.nested.exposed3': 'number',
        'deeply.nested.structure.exposed4': 'string',
        // notExposed5, notExposed6, notExposed7, and notExposed8 are not present
      },
    });
  });
});
