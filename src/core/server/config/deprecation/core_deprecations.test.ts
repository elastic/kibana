/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { configDeprecationFactory, applyDeprecations } from '@kbn/config';
import { coreDeprecationProvider } from './core_deprecations';

const initialEnv = { ...process.env };

const applyCoreDeprecations = (settings: Record<string, any> = {}) => {
  const deprecations = coreDeprecationProvider(configDeprecationFactory);
  const deprecationMessages: string[] = [];
  const migrated = applyDeprecations(
    settings,
    deprecations.map((deprecation) => ({
      deprecation,
      path: '',
    })),
    (msg) => deprecationMessages.push(msg)
  );
  return {
    messages: deprecationMessages,
    migrated,
  };
};

describe('core deprecations', () => {
  beforeEach(() => {
    process.env = { ...initialEnv };
  });

  describe('configPath', () => {
    it('logs a warning if CONFIG_PATH environ variable is set', () => {
      process.env.CONFIG_PATH = 'somepath';
      const { messages } = applyCoreDeprecations();
      expect(messages).toMatchInlineSnapshot(`
        Array [
          "Environment variable CONFIG_PATH is deprecated. It has been replaced with KBN_PATH_CONF pointing to a config folder",
        ]
      `);
    });

    it('does not log a warning if CONFIG_PATH environ variable is unset', () => {
      delete process.env.CONFIG_PATH;
      const { messages } = applyCoreDeprecations();
      expect(messages).toHaveLength(0);
    });
  });

  describe('dataPath', () => {
    it('logs a warning if DATA_PATH environ variable is set', () => {
      process.env.DATA_PATH = 'somepath';
      const { messages } = applyCoreDeprecations();
      expect(messages).toMatchInlineSnapshot(`
        Array [
          "Environment variable \\"DATA_PATH\\" will be removed.  It has been replaced with kibana.yml setting \\"path.data\\"",
        ]
      `);
    });

    it('does not log a warning if DATA_PATH environ variable is unset', () => {
      delete process.env.DATA_PATH;
      const { messages } = applyCoreDeprecations();
      expect(messages).toHaveLength(0);
    });
  });

  describe('xsrfDeprecation', () => {
    it('logs a warning if server.xsrf.whitelist is set', () => {
      const { migrated, messages } = applyCoreDeprecations({
        server: { xsrf: { whitelist: ['/path'] } },
      });
      expect(migrated.server.xsrf.allowlist).toEqual(['/path']);
      expect(messages).toMatchInlineSnapshot(`
        Array [
          "\\"server.xsrf.whitelist\\" is deprecated and has been replaced by \\"server.xsrf.allowlist\\"",
        ]
      `);
    });
  });

  describe('server.cors', () => {
    it('renames server.cors to server.cors.enabled', () => {
      const { migrated } = applyCoreDeprecations({
        server: { cors: true },
      });
      expect(migrated.server.cors).toEqual({ enabled: true });
    });
    it('logs a warning message about server.cors renaming', () => {
      const { messages } = applyCoreDeprecations({
        server: { cors: true },
      });
      expect(messages).toMatchInlineSnapshot(`
        Array [
          "\\"server.cors\\" is deprecated and has been replaced by \\"server.cors.enabled\\"",
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
      const { messages } = applyCoreDeprecations({
        server: {
          basePath: 'foo',
        },
      });
      expect(messages).toMatchInlineSnapshot(`
        Array [
          "You should set server.basePath along with server.rewriteBasePath. Starting in 7.0, Kibana will expect that all requests start with server.basePath rather than expecting you to rewrite the requests in your reverse proxy. Set server.rewriteBasePath to false to preserve the current behavior and silence this warning.",
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

  describe('cspRulesDeprecation', () => {
    describe('with nonce source', () => {
      it('logs a warning', () => {
        const settings = {
          csp: {
            rules: [`script-src 'self' 'nonce-{nonce}'`],
          },
        };
        const { messages } = applyCoreDeprecations(settings);
        expect(messages).toMatchInlineSnapshot(`
            Array [
              "csp.rules no longer supports the {nonce} syntax. Replacing with 'self' in script-src",
            ]
        `);
      });

      it('replaces a nonce', () => {
        expect(
          applyCoreDeprecations({ csp: { rules: [`script-src 'nonce-{nonce}'`] } }).migrated.csp
            .rules
        ).toEqual([`script-src 'self'`]);
        expect(
          applyCoreDeprecations({ csp: { rules: [`script-src 'unsafe-eval' 'nonce-{nonce}'`] } })
            .migrated.csp.rules
        ).toEqual([`script-src 'unsafe-eval' 'self'`]);
      });

      it('removes a quoted nonce', () => {
        expect(
          applyCoreDeprecations({ csp: { rules: [`script-src 'self' 'nonce-{nonce}'`] } }).migrated
            .csp.rules
        ).toEqual([`script-src 'self'`]);
        expect(
          applyCoreDeprecations({ csp: { rules: [`script-src 'nonce-{nonce}' 'self'`] } }).migrated
            .csp.rules
        ).toEqual([`script-src 'self'`]);
      });

      it('removes a non-quoted nonce', () => {
        expect(
          applyCoreDeprecations({ csp: { rules: [`script-src 'self' nonce-{nonce}`] } }).migrated
            .csp.rules
        ).toEqual([`script-src 'self'`]);
        expect(
          applyCoreDeprecations({ csp: { rules: [`script-src nonce-{nonce} 'self'`] } }).migrated
            .csp.rules
        ).toEqual([`script-src 'self'`]);
      });

      it('removes a strange nonce', () => {
        expect(
          applyCoreDeprecations({ csp: { rules: [`script-src 'self' blah-{nonce}-wow`] } }).migrated
            .csp.rules
        ).toEqual([`script-src 'self'`]);
      });

      it('removes multiple nonces', () => {
        expect(
          applyCoreDeprecations({
            csp: {
              rules: [
                `script-src 'nonce-{nonce}' 'self' blah-{nonce}-wow`,
                `style-src 'nonce-{nonce}' 'self'`,
              ],
            },
          }).migrated.csp.rules
        ).toEqual([`script-src 'self'`, `style-src 'self'`]);
      });
    });

    describe('without self source', () => {
      it('logs a warning', () => {
        const { messages } = applyCoreDeprecations({
          csp: { rules: [`script-src 'unsafe-eval'`] },
        });
        expect(messages).toMatchInlineSnapshot(`
              Array [
                "csp.rules must contain the 'self' source. Automatically adding to script-src.",
              ]
        `);
      });

      it('adds self', () => {
        expect(
          applyCoreDeprecations({ csp: { rules: [`script-src 'unsafe-eval'`] } }).migrated.csp.rules
        ).toEqual([`script-src 'unsafe-eval' 'self'`]);
      });
    });

    it('does not add self to other policies', () => {
      expect(
        applyCoreDeprecations({ csp: { rules: [`worker-src blob:`] } }).migrated.csp.rules
      ).toEqual([`worker-src blob:`]);
    });
  });

  describe('logging.events.ops', () => {
    it('warns when ops events are used', () => {
      const { messages } = applyCoreDeprecations({
        logging: { events: { ops: '*' } },
      });
      expect(messages).toMatchInlineSnapshot(`
        Array [
          "\\"logging.events.ops\\" has been deprecated and will be removed in 8.0. To access ops data moving forward, please enable debug logs for the \\"metrics.ops\\" context in your logging configuration.",
        ]
      `);
    });

    it('does not warn when other events are configured', () => {
      const { messages } = applyCoreDeprecations({
        logging: { events: { log: '*' } },
      });
      expect(messages).toEqual([]);
    });
  });
});
