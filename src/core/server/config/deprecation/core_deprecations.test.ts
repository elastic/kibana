/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getDeprecationsForGlobalSettings } from '../test_utils';
import { coreDeprecationProvider } from './core_deprecations';

const initialEnv = { ...process.env };

const applyCoreDeprecations = (settings?: Record<string, any>) =>
  getDeprecationsForGlobalSettings({ provider: coreDeprecationProvider, settings });

describe('core deprecations', () => {
  beforeEach(() => {
    process.env = { ...initialEnv };
  });

  describe('server.cors', () => {
    it('renames server.cors to server.cors.enabled', () => {
      const { migrated } = applyCoreDeprecations({
        server: { cors: true },
      });
      expect(migrated.server.cors).toEqual({ enabled: true });
    });

    it('logs a warning message about server.cors renaming', () => {
      const { messages, levels } = applyCoreDeprecations({
        server: { cors: true },
      });
      expect(messages).toMatchInlineSnapshot(`
        Array [
          "\\"server.cors\\" is deprecated and has been replaced by \\"server.cors.enabled\\"",
        ]
      `);
      expect(levels).toMatchInlineSnapshot(`
        Array [
          "warning",
        ]
      `);
    });

    it('does not log deprecation message when server.cors.enabled set', () => {
      const { migrated, messages } = applyCoreDeprecations({
        server: { cors: { enabled: true } },
      });
      expect(migrated.server.cors).toEqual({ enabled: true });
      expect(messages.length).toBe(0);
    });
  });

  describe('rewriteBasePath', () => {
    it('logs a warning is server.basePath is set and server.rewriteBasePath is not', () => {
      const { messages, levels } = applyCoreDeprecations({
        server: {
          basePath: 'foo',
        },
      });
      expect(messages).toMatchInlineSnapshot(`
        Array [
          "You should set server.basePath along with server.rewriteBasePath. Starting in 7.0, Kibana will expect that all requests start with server.basePath rather than expecting you to rewrite the requests in your reverse proxy. Set server.rewriteBasePath to false to preserve the current behavior and silence this warning.",
        ]
      `);
      expect(levels).toMatchInlineSnapshot(`
        Array [
          "warning",
        ]
      `);
    });

    it('does not log a warning if both server.basePath and server.rewriteBasePath are unset', () => {
      const { messages } = applyCoreDeprecations({
        server: {},
      });
      expect(messages).toHaveLength(0);
    });

    it('does not log a warning if both server.basePath and server.rewriteBasePath are set', () => {
      const { messages } = applyCoreDeprecations({
        server: {
          basePath: 'foo',
          rewriteBasePath: true,
        },
      });
      expect(messages).toHaveLength(0);
    });
  });
});
