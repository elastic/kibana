/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { applyMetaSettings } from './apply_meta_settings';

describe('applyMetaSettings', () => {
  test('should not apply the meta settings to the config if the schema is invalid', () => {
    const config = {
      myPlugin: { someValue: 'value' },
    };
    const metaSettings = new Map([
      [
        'myPlugin.metaSetting',
        [
          {
            schema: schema.literal(true),
            priority: 100,
            config: { 'myPlugin.someValue': 'new-value' },
          },
        ],
      ],
    ]);
    const result = applyMetaSettings(config, metaSettings);
    expect(result).toEqual(config);
  });

  test('should not apply the meta settings but still remove it from the config object if the schema is invalid', () => {
    const config = {
      myPlugin: { metaSetting: false, someValue: 'value' },
    };
    const metaSettings = new Map([
      [
        'myPlugin.metaSetting',
        [
          {
            schema: schema.literal(true),
            priority: 100,
            config: { 'myPlugin.someValue': 'new-value' },
          },
        ],
      ],
    ]);
    const result = applyMetaSettings(config, metaSettings);
    expect(result).toEqual({
      myPlugin: { someValue: 'value' },
    });
  });

  test('should apply the meta settings to the config if the schema is valid', () => {
    const config = {
      myPlugin: { metaSetting: true },
    };
    const metaSettings = new Map([
      [
        'myPlugin.metaSetting',
        [
          {
            schema: schema.literal(true),
            priority: 100,
            config: { 'myPlugin.someValue': 'new-value' },
          },
        ],
      ],
    ]);
    const result = applyMetaSettings(config, metaSettings);
    expect(result).toEqual({
      myPlugin: { someValue: 'new-value' },
    });
  });

  test('should preserve the user config overrides over the meta settings', () => {
    const config = {
      myPlugin: { metaSetting: true, someValue: 'user-value' },
    };
    const metaSettings = new Map([
      [
        'myPlugin.metaSetting',
        [
          {
            schema: schema.literal(true),
            priority: 100,
            config: { 'myPlugin.someValue': 'new-value' },
          },
        ],
      ],
    ]);
    const result = applyMetaSettings(config, metaSettings);
    expect(result).toEqual({
      myPlugin: { someValue: 'user-value' },
    });
  });

  test('supports multiple priorities for the same meta setting', () => {
    const config = {
      myPlugin: { metaSetting: true },
    };
    const metaSettings = new Map([
      [
        'myPlugin.metaSetting',
        [
          {
            schema: schema.literal(true),
            priority: 100,
            config: { 'myPlugin.someValue': 'new-value' },
          },
          {
            schema: schema.literal(true),
            priority: 200,
            config: { 'myPlugin.someValue': 'new-value-2' },
          },
          {
            schema: schema.literal(true),
            priority: 300,
            config: { 'myPlugin.someOtherValue': 'new-value-3' },
          },
          {
            schema: schema.literal(false), // This one should not be applied
            priority: 400,
            config: { 'myPlugin.someOtherValue': 'new-value-4' },
          },
        ],
      ],
    ]);
    const result = applyMetaSettings(config, metaSettings);
    expect(result).toEqual({
      myPlugin: { someValue: 'new-value-2', someOtherValue: 'new-value-3' },
    });
  });

  test('supports multiple meta settings with different priorities', () => {
    const config = {
      anotherMetaSetting: true,
      myPlugin: { metaSetting: true },
    };
    const metaSettings = new Map([
      [
        'myPlugin.metaSetting',
        [
          {
            schema: schema.literal(true),
            priority: 100,
            config: { 'myPlugin.someValue': 'new-value' },
          },
        ],
      ],
      [
        'anotherMetaSetting',
        [
          {
            schema: schema.literal(true),
            priority: 200,
            config: {
              'myPlugin.someValue': 'new-value-2',
              'myPlugin.someOtherValue': 'new-value-2',
            },
          },
        ],
      ],
    ]);
    const result = applyMetaSettings(config, metaSettings);
    expect(result).toEqual({
      myPlugin: { someValue: 'new-value-2', someOtherValue: 'new-value-2' },
    });
  });

  test('supports meta settings that set other meta settings', () => {
    const config = {
      aSuperMetaSetting: true,
    };
    const metaSettings = new Map([
      [
        'myPlugin.metaSetting',
        [
          {
            schema: schema.literal(true),
            priority: 100,
            config: { 'myPlugin.someValue': 'new-value' },
          },
        ],
      ],
      [
        'aSuperMetaSetting',
        [
          {
            schema: schema.literal(true),
            priority: 200, // Even if the priority is higher, the logic should realize that it needs to re-run the meta-settings replacements.
            config: { 'myPlugin.metaSetting': true },
          },
        ],
      ],
    ]);
    const result = applyMetaSettings(config, metaSettings);
    expect(result).toEqual({
      myPlugin: { someValue: 'new-value' },
    });
  });

  test('a super-meta setting disables another meta setting enabled by the user when the priority is higher', () => {
    const config = {
      myPlugin: { metaSetting: true },
      anotherMetaSetting: true,
    };
    const metaSettings = new Map([
      [
        'myPlugin.metaSetting',
        [
          {
            schema: schema.literal(true),
            priority: 100,
            config: { 'myPlugin.someValue': 'new-value' },
          },
        ],
      ],
      [
        'anotherMetaSetting',
        [
          {
            schema: schema.literal(true),
            priority: 200,
            config: { 'myPlugin.metaSetting': false },
          },
        ],
      ],
    ]);
    const result = applyMetaSettings(config, metaSettings);
    expect(result).toEqual({
      myPlugin: {},
    });
  });

  test('a super-meta setting disables another meta setting enabled by the user, even if the priority is lower', () => {
    const config = {
      myPlugin: { metaSetting: true },
      anotherMetaSetting: true,
    };
    const metaSettings = new Map([
      [
        'myPlugin.metaSetting',
        [
          {
            schema: schema.literal(true),
            priority: 200,
            config: { 'myPlugin.someValue': 'new-value' },
          },
        ],
      ],
      [
        'anotherMetaSetting',
        [
          {
            schema: schema.literal(true),
            priority: 100,
            config: { 'myPlugin.metaSetting': false },
          },
        ],
      ],
    ]);
    const result = applyMetaSettings(config, metaSettings);
    expect(result).toEqual({
      myPlugin: {},
    });
  });

  test('supports flat and nested config objects', () => {
    const config = {
      anotherMetaSetting: true,
      myPlugin: { metaSetting: true },
    };
    const metaSettings = new Map([
      [
        'myPlugin.metaSetting',
        [
          {
            schema: schema.literal(true),
            priority: 100,
            config: { 'myPlugin.someValue': 'new-value' },
          },
        ],
      ],
      [
        'anotherMetaSetting',
        [
          {
            schema: schema.literal(true),
            priority: 200,
            config: {
              myPlugin: { someValue: 'new-value-2', someOtherValue: 'new-value-2' },
            },
          },
        ],
      ],
    ]);
    const result = applyMetaSettings(config, metaSettings);
    expect(result).toEqual({
      myPlugin: { someValue: 'new-value-2', someOtherValue: 'new-value-2' },
    });
  });
});
