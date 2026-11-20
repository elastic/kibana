/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginConfigDescriptor } from '@kbn/core-plugins-server';
import { createBrowserConfig, getExposedConfigKeys } from './create_browser_config';
import type { TypeOf } from '@kbn/config-schema';
import { offeringBasedSchema, schema } from '@kbn/config-schema';

const getBrowserConfigAndExposedKeys = <T>(config: T, descriptor: PluginConfigDescriptor<T>) => ({
  ...createBrowserConfig(config, descriptor),
  exposedConfigKeys: getExposedConfigKeys(descriptor),
});

describe('createBrowserConfig and getExposedConfigKeys', () => {
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

    const result = getBrowserConfigAndExposedKeys(config, descriptor);
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

    const result = getBrowserConfigAndExposedKeys(config, descriptor);
    expect(result).toEqual({
      browserConfig: {
        exposed1: '1',
        nested: { exposed2: true, exposed3: 3 },
        // notExposed4 is not present
      },
      exposedConfigKeys: {
        exposed1: 'string',
        'nested.exposed2': 'boolean',
        'nested.exposed3': 'number?',
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

    const result = getBrowserConfigAndExposedKeys(config, descriptor);
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

    const result = getBrowserConfigAndExposedKeys(config, descriptor);
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
        'deeply.nested.exposed3': 'number?',
        'deeply.nested.structure.exposed4': 'string',
        // notExposed5, notExposed6, notExposed7, and notExposed8 are not present
      },
    });
  });

  it('lists keys nested inside offering-based schemas', () => {
    const configSchema = schema.object({
      offering: offeringBasedSchema({
        serverless: schema.object({
          exposed1: schema.boolean({ defaultValue: false }),
          notExposed2: schema.maybe(schema.string()),
        }),
      }),
    });
    const descriptor: PluginConfigDescriptor<TypeOf<typeof configSchema>> = {
      schema: configSchema,
      exposeToBrowser: {
        offering: { exposed1: true },
      },
    };

    const result = getBrowserConfigAndExposedKeys(
      { offering: { exposed1: true, notExposed2: '2' } },
      descriptor
    );
    expect(result).toEqual({
      browserConfig: { offering: { exposed1: true } },
      exposedConfigKeys: { 'offering.exposed1': 'boolean?|never' },
    });
  });

  it('lists keys nested inside oneOf schemas', () => {
    const configSchema = schema.object({
      oneOf: schema.oneOf([
        schema.object({ exposed1: schema.string(), notExposed2: schema.string() }),
        schema.object({ exposed1: schema.number() }),
      ]),
    });
    const descriptor: PluginConfigDescriptor<TypeOf<typeof configSchema>> = {
      schema: configSchema,
      exposeToBrowser: {
        oneOf: { exposed1: true },
      },
    };

    const result = getBrowserConfigAndExposedKeys(
      { oneOf: { exposed1: '1', notExposed2: '2' } },
      descriptor
    );
    expect(result).toEqual({
      browserConfig: { oneOf: { exposed1: '1' } },
      exposedConfigKeys: { 'oneOf.exposed1': 'string|number' },
    });
  });

  it('lists a leaf branch that a partial selector picks keys from', () => {
    const configSchema = schema.object({
      settings: schema.conditional(
        schema.contextRef('serverless'),
        true,
        schema.object({ enabled: schema.boolean() }),
        schema.recordOf(schema.string(), schema.string())
      ),
    });
    const descriptor: PluginConfigDescriptor<TypeOf<typeof configSchema>> = {
      schema: configSchema,
      exposeToBrowser: {
        settings: { enabled: true },
      },
    };

    const result = getBrowserConfigAndExposedKeys(
      { settings: { enabled: 'from-record', other: 'value' } },
      descriptor
    );
    expect(result).toEqual({
      browserConfig: { settings: { enabled: 'from-record' } },
      exposedConfigKeys: {
        settings: 'record [selected: {"enabled":true}]',
        'settings.enabled': 'boolean|never',
      },
    });

    expect(getExposedConfigKeys({ ...descriptor, exposeToBrowser: { settings: true } })).toEqual({
      settings: 'record',
      'settings.enabled': 'boolean|never',
    });
    expect(
      getExposedConfigKeys({ ...descriptor, exposeToBrowser: { settings: { other: true } } })
    ).toEqual({ settings: 'record [selected: {"other":true}]' });
  });

  it('distinguishes literal dots in schema keys from nested paths', () => {
    const configSchema = schema.object({
      'nested.key': schema.string(),
      nested: schema.object({ key: schema.boolean() }),
    });
    const descriptor: PluginConfigDescriptor<TypeOf<typeof configSchema>> = {
      schema: configSchema,
      exposeToBrowser: { 'nested.key': true, nested: { key: true } },
    };

    expect(getExposedConfigKeys(descriptor)).toEqual({
      'nested\\.key': 'string',
      'nested.key': 'boolean',
    });
  });

  it('lists nothing for a config schema without keys', () => {
    const configSchema = schema.object({});
    const descriptor: PluginConfigDescriptor<TypeOf<typeof configSchema>> = {
      schema: configSchema,
      exposeToBrowser: {},
    };

    const result = getBrowserConfigAndExposedKeys({}, descriptor);
    expect(result).toEqual({ browserConfig: {}, exposedConfigKeys: {} });
  });
});
