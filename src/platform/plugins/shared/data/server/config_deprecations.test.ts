/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';

import { applyDeprecations, configDeprecationFactory } from '@kbn/config';
import { configDeprecationsMock } from '@kbn/core/server/mocks';

import { configDeprecationProvider } from './config_deprecations';

const deprecationContext = configDeprecationsMock.createContext();

const applyConfigDeprecations = (settings: Record<string, any> = {}) => {
  const deprecations = configDeprecationProvider(configDeprecationFactory);
  const deprecationMessages: string[] = [];
  const migrated = applyDeprecations(
    settings,
    deprecations.map((deprecation) => ({
      deprecation,
      path: '',
      context: deprecationContext,
    })),
    () =>
      ({ message }) =>
        deprecationMessages.push(message)
  );
  return {
    messages: deprecationMessages,
    migrated: migrated.config,
  };
};

describe('Config Deprecations', () => {
  it('does not report deprecations for default configuration', () => {
    const defaultConfig = { data: { search: { sessions: {} } } };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(defaultConfig));
    expect(migrated).toEqual(defaultConfig);
    expect(messages).toHaveLength(0);
  });

  it('renames xpack.data_enhanced.search.sessions.* to data.search.sessions.*', () => {
    const config = {
      xpack: {
        data_enhanced: {
          search: {
            sessions: {
              enabled: false,
            },
          },
        },
      },
    };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated.xpack?.data_enhanced).not.toBeDefined();
    expect(migrated.data.search.sessions.enabled).toEqual(false);
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "Setting \\"xpack.data_enhanced.search.sessions\\" has been replaced by \\"data.search.sessions\\"",
        "Configuring \\"data.search.sessions.enabled\\" is deprecated and will be removed in 9.1.0.",
      ]
    `);
  });

  test('reports about old, no longer used configs', () => {
    const config = {
      data: {
        search: {
          sessions: {
            enabled: false,
            pageSize: 1000,
            trackingInterval: '30s',
            cleanupInterval: '30s',
            expireInterval: '30s',
            monitoringTaskTimeout: '30s',
            notTouchedInProgressTimeout: '30s',
          },
        },
      },
    };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "search": Object {
            "sessions": Object {
              "enabled": false,
            },
          },
        },
      }
    `);
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "You no longer need to configure \\"data.search.sessions.pageSize\\".",
        "You no longer need to configure \\"data.search.sessions.trackingInterval\\".",
        "You no longer need to configure \\"data.search.sessions.cleanupInterval\\".",
        "You no longer need to configure \\"data.search.sessions.expireInterval\\".",
        "You no longer need to configure \\"data.search.sessions.monitoringTaskTimeout\\".",
        "You no longer need to configure \\"data.search.sessions.notTouchedInProgressTimeout\\".",
        "Configuring \\"data.search.sessions.enabled\\" is deprecated and will be removed in 9.1.0.",
      ]
    `);
  });

  test('reports about old, no longer used configs from xpack.data_enhanced', () => {
    const config = {
      xpack: {
        data_enhanced: {
          search: {
            sessions: {
              enabled: false,
              pageSize: 1000,
              trackingInterval: '30s',
              cleanupInterval: '30s',
              expireInterval: '30s',
              monitoringTaskTimeout: '30s',
              notTouchedInProgressTimeout: '30s',
            },
          },
        },
      },
    };
    const { messages, migrated } = applyConfigDeprecations(cloneDeep(config));
    expect(migrated).toMatchInlineSnapshot(`
      Object {
        "data": Object {
          "search": Object {
            "sessions": Object {
              "enabled": false,
            },
          },
        },
      }
    `);
    expect(messages).toMatchInlineSnapshot(`
      Array [
        "Setting \\"xpack.data_enhanced.search.sessions\\" has been replaced by \\"data.search.sessions\\"",
        "You no longer need to configure \\"data.search.sessions.pageSize\\".",
        "You no longer need to configure \\"data.search.sessions.trackingInterval\\".",
        "You no longer need to configure \\"data.search.sessions.cleanupInterval\\".",
        "You no longer need to configure \\"data.search.sessions.expireInterval\\".",
        "You no longer need to configure \\"data.search.sessions.monitoringTaskTimeout\\".",
        "You no longer need to configure \\"data.search.sessions.notTouchedInProgressTimeout\\".",
        "Configuring \\"data.search.sessions.enabled\\" is deprecated and will be removed in 9.1.0.",
      ]
    `);
  });
});
