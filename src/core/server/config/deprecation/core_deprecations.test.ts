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

  describe('configPath', () => {
    it('logs a warning if CONFIG_PATH environ variable is set', () => {
      process.env.CONFIG_PATH = 'somepath';
      const { messages } = applyCoreDeprecations();
      expect(messages).toEqual(
        expect.arrayContaining([
          'Environment variable "CONFIG_PATH" is deprecated. It has been replaced with "KBN_PATH_CONF" pointing to a config folder',
        ])
      );
    });

    it('does not log a warning if CONFIG_PATH environ variable is unset', () => {
      delete process.env.CONFIG_PATH;
      const { messages } = applyCoreDeprecations();
      expect(messages).toHaveLength(1);
    });
  });

  describe('kibanaPathConf', () => {
    it('logs a warning if KIBANA_PATH_CONF environ variable is set', () => {
      process.env.KIBANA_PATH_CONF = 'somepath';
      const { messages } = applyCoreDeprecations();
      expect(messages).toEqual(
        expect.arrayContaining([
          'Environment variable "KIBANA_PATH_CONF" is deprecated. It has been replaced with "KBN_PATH_CONF" pointing to a config folder',
        ])
      );
    });

    it('does not log a warning if KIBANA_PATH_CONF environ variable is unset', () => {
      delete process.env.KIBANA_PATH_CONF;
      const { messages } = applyCoreDeprecations();
      expect(messages).toHaveLength(1);
    });
  });

  describe('dataPath', () => {
    it('logs a warning if DATA_PATH environ variable is set', () => {
      process.env.DATA_PATH = 'somepath';
      const { messages } = applyCoreDeprecations();
      expect(messages).toEqual(
        expect.arrayContaining([
          'Environment variable "DATA_PATH" will be removed.  It has been replaced with kibana.yml setting "path.data"',
        ])
      );
    });

    it('does not log a warning if DATA_PATH environ variable is unset', () => {
      delete process.env.DATA_PATH;
      const { messages } = applyCoreDeprecations();
      expect(messages).toHaveLength(1);
    });
  });

  describe('xsrfDeprecation', () => {
    it('logs a warning if server.xsrf.whitelist is set', () => {
      const { migrated, messages } = applyCoreDeprecations({
        server: { xsrf: { whitelist: ['/path'] } },
      });
      expect(migrated.server.xsrf.allowlist).toEqual(['/path']);
      expect(messages).toEqual(
        expect.arrayContaining([
          'Setting "server.xsrf.whitelist" has been replaced by "server.xsrf.allowlist"',
        ])
      );
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
      expect(messages).toEqual(
        expect.arrayContaining([
          '"server.cors" is deprecated and has been replaced by "server.cors.enabled"',
        ])
      );
    });
    it('does not log deprecation message when server.cors.enabled set', () => {
      const { migrated, messages } = applyCoreDeprecations({
        server: { cors: { enabled: true } },
      });
      expect(migrated.server.cors).toEqual({ enabled: true });
      expect(messages.length).toBe(1);
    });
  });

  describe('server.host', () => {
    it('logs a warning if server.host is set to "0"', () => {
      const { messages } = applyCoreDeprecations({
        server: { host: '0' },
      });
      expect(messages).toEqual(
        expect.arrayContaining([
          'Support for setting server.host to "0" in kibana.yml is deprecated and will be removed in Kibana version 8.0.0. Instead use "0.0.0.0" to bind to all interfaces.',
        ])
      );
    });
    it('does not log a warning if server.host is not set to "0"', () => {
      const { migrated, messages } = applyCoreDeprecations({
        server: { host: '0.0.0.0' },
      });
      expect(migrated.server.host).toEqual('0.0.0.0');
      expect(messages.length).toBe(1);
    });
  });

  describe('rewriteBasePath', () => {
    it('logs a warning is server.basePath is set and server.rewriteBasePath is not', () => {
      const { messages, levels } = applyCoreDeprecations({
        server: {
          basePath: 'foo',
        },
      });
      expect(messages).toEqual(
        expect.arrayContaining([
          'You should set server.basePath along with server.rewriteBasePath. Starting in 7.0, Kibana will expect that all requests start with server.basePath rather than expecting you to rewrite the requests in your reverse proxy. Set server.rewriteBasePath to false to preserve the current behavior and silence this warning.',
        ])
      );
      expect(levels).toMatchInlineSnapshot(`
        Array [
          "warning",
          "warning",
        ]
      `);
    });

    it('does not log a warning if both server.basePath and server.rewriteBasePath are unset', () => {
      const { messages } = applyCoreDeprecations({
        server: {},
      });
      expect(messages).toHaveLength(1);
    });

    it('does not log a warning if both server.basePath and server.rewriteBasePath are set', () => {
      const { messages } = applyCoreDeprecations({
        server: {
          basePath: 'foo',
          rewriteBasePath: true,
        },
      });
      expect(messages).toHaveLength(1);
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
        expect(messages).toEqual(
          expect.arrayContaining([
            "csp.rules no longer supports the {nonce} syntax. Replacing with 'self' in script-src",
          ])
        );
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
        expect(messages).toEqual(
          expect.arrayContaining([
            "csp.rules must contain the 'self' source. Automatically adding to script-src.",
          ])
        );
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
      expect(messages).toEqual(
        expect.arrayContaining([
          '"logging.events.ops" has been deprecated and will be removed in 8.0. To access ops data moving forward, please enable debug logs for the "metrics.ops" context in your logging configuration.',
        ])
      );
    });
  });

  describe('logging.events.request', () => {
    it('warns when request event is used', () => {
      const { messages } = applyCoreDeprecations({
        logging: { events: { request: '*' } },
      });
      expect(messages).toEqual(
        expect.arrayContaining([
          '"logging.events.request" has been deprecated and will be removed in 8.0. To access request data moving forward, please enable debug logs for the "http.server.response" context in your logging configuration.',
        ])
      );
    });
  });

  describe('logging.events.response', () => {
    it('warns when response event is used', () => {
      const { messages } = applyCoreDeprecations({
        logging: { events: { response: '*' } },
      });
      expect(messages).toEqual(
        expect.arrayContaining([
          '"logging.events.response" has been deprecated and will be removed in 8.0. To access response data moving forward, please enable debug logs for the "http.server.response" context in your logging configuration.',
        ])
      );
    });
  });

  describe('logging.timezone', () => {
    it('warns when ops events are used', () => {
      const { messages } = applyCoreDeprecations({
        logging: { timezone: 'GMT' },
      });
      expect(messages).toEqual(
        expect.arrayContaining([
          '"logging.timezone" has been deprecated and will be removed in 8.0. To set the timezone moving forward, please add a timezone date modifier to the log pattern in your logging configuration.',
        ])
      );
    });
  });

  describe('logging.dest', () => {
    it('warns when dest is used', () => {
      const { messages } = applyCoreDeprecations({
        logging: { dest: 'stdout' },
      });
      expect(messages).toEqual(
        expect.arrayContaining([
          '"logging.dest" has been deprecated and will be removed in 8.0. To set the destination moving forward, you can use the "console" appender in your logging configuration or define a custom one.',
        ])
      );
    });
    it('warns when dest path is given', () => {
      const { messages } = applyCoreDeprecations({
        logging: { dest: '/log-log.txt' },
      });
      expect(messages).toEqual(
        expect.arrayContaining([
          '"logging.dest" has been deprecated and will be removed in 8.0. To set the destination moving forward, you can use the "console" appender in your logging configuration or define a custom one.',
        ])
      );
    });
  });

  describe('logging.quiet, logging.silent and logging.verbose', () => {
    it('warns when quiet is used', () => {
      const { messages } = applyCoreDeprecations({
        logging: { quiet: true },
      });
      expect(messages).toEqual(
        expect.arrayContaining([
          '"logging.quiet" has been deprecated and will be removed in 8.0. Moving forward, you can use "logging.root.level:error" in your logging configuration.',
        ])
      );
    });
    it('warns when silent is used', () => {
      const { messages } = applyCoreDeprecations({
        logging: { silent: true },
      });
      expect(messages).toEqual(
        expect.arrayContaining([
          '"logging.silent" has been deprecated and will be removed in 8.0. Moving forward, you can use "logging.root.level:off" in your logging configuration.',
        ])
      );
    });
    it('warns when verbose is used', () => {
      const { messages } = applyCoreDeprecations({
        logging: { verbose: true },
      });
      expect(messages).toEqual(
        expect.arrayContaining([
          '"logging.verbose" has been deprecated and will be removed in 8.0. Moving forward, you can use "logging.root.level:all" in your logging configuration.',
        ])
      );
    });
  });

  describe('logging.json', () => {
    it('warns when json is used', () => {
      const { messages } = applyCoreDeprecations({
        logging: { json: true },
      });
      expect(messages).toEqual(
        expect.arrayContaining([
          '"logging.json" has been deprecated and will be removed in 8.0. To specify log message format moving forward, you can configure the "appender.layout" property for every custom appender in your logging configuration. There is currently no default layout for custom appenders and each one must be declared explicitly.',
        ])
      );
    });
  });

  describe('logging.rotate.enabled, logging.rotate.usePolling, logging.rotate.pollingInterval, logging.rotate.everyBytes and logging.rotate.keepFiles', () => {
    it('warns when logging.rotate configurations are used', () => {
      const { messages } = applyCoreDeprecations({
        logging: { rotate: { enabled: true } },
      });
      expect(messages).toEqual(
        expect.arrayContaining([
          '"logging.rotate" and sub-options have been deprecated and will be removed in 8.0. Moving forward, you can enable log rotation using the "rolling-file" appender for a logger in your logging configuration.',
        ])
      );
    });

    it('warns when logging.rotate polling configurations are used', () => {
      const { messages } = applyCoreDeprecations({
        logging: { rotate: { enabled: true, usePolling: true, pollingInterval: 5000 } },
      });
      expect(messages).toEqual(
        expect.arrayContaining([
          '"logging.rotate" and sub-options have been deprecated and will be removed in 8.0. Moving forward, you can enable log rotation using the "rolling-file" appender for a logger in your logging configuration.',
        ])
      );
    });

    it('warns when logging.rotate.everyBytes configurations are used', () => {
      const { messages } = applyCoreDeprecations({
        logging: { rotate: { enabled: true, everyBytes: 1048576 } },
      });
      expect(messages).toEqual(
        expect.arrayContaining([
          '"logging.rotate" and sub-options have been deprecated and will be removed in 8.0. Moving forward, you can enable log rotation using the "rolling-file" appender for a logger in your logging configuration.',
        ])
      );
    });

    it('warns when logging.rotate.keepFiles is used', () => {
      const { messages } = applyCoreDeprecations({
        logging: { rotate: { enabled: true, keepFiles: 1024 } },
      });
      expect(messages).toEqual(
        expect.arrayContaining([
          '"logging.rotate" and sub-options have been deprecated and will be removed in 8.0. Moving forward, you can enable log rotation using the "rolling-file" appender for a logger in your logging configuration.',
        ])
      );
    });
  });

  describe('logging.events.log', () => {
    it('warns when events.log is used', () => {
      const { messages } = applyCoreDeprecations({
        logging: { events: { log: ['info'] } },
      });
      expect(messages).toEqual(
        expect.arrayContaining([
          '"logging.events.log" has been deprecated and will be removed in 8.0. Moving forward, log levels can be customized on a per-logger basis using the new logging configuration.',
        ])
      );
    });
  });

  describe('logging.events.error', () => {
    it('warns when events.error is used', () => {
      const { messages } = applyCoreDeprecations({
        logging: { events: { error: ['some error'] } },
      });
      expect(messages).toEqual(
        expect.arrayContaining([
          '"logging.events.error" has been deprecated and will be removed in 8.0. Moving forward, you can use "logging.root.level: error" in your logging configuration.',
        ])
      );
    });
  });

  describe('logging.filter', () => {
    it('warns when filter.cookie is used', () => {
      const { messages } = applyCoreDeprecations({
        logging: { filter: { cookie: 'none' } },
      });
      expect(messages).toEqual(
        expect.arrayContaining(['"logging.filter" has been deprecated and will be removed in 8.0.'])
      );
    });

    it('warns when filter.authorization is used', () => {
      const { messages } = applyCoreDeprecations({
        logging: { filter: { authorization: 'none' } },
      });
      expect(messages).toEqual(
        expect.arrayContaining(['"logging.filter" has been deprecated and will be removed in 8.0.'])
      );
    });
  });

  describe('log format', () => {
    it('always logs a deprecation warning', () => {
      const { messages } = applyCoreDeprecations();
      expect(messages).toEqual(
        expect.arrayContaining([
          'Starting in 8.0, the Kibana logging format will be changing. This may affect you if you are doing any special handling of your Kibana logs, such as ingesting logs into Elasticsearch for further analysis. If you are using the new logging configuration, you are already receiving logs in both old and new formats, and the old format will simply be going away. If you are not yet using the new logging configuration, the log format will change upon upgrade to 8.0. Beginning in 8.0, the format of JSON logs will be ECS-compatible JSON, and the default pattern log format will be configurable with our new logging system. Please refer to the documentation for more information about the new logging format.',
        ])
      );
    });
  });
});
