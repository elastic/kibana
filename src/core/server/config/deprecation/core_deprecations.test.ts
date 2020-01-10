/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { coreDeprecationProvider } from './core_deprecations';
import { configDeprecationFactory } from './deprecation_factory';
import { applyDeprecations } from './apply_deprecations';

const initialEnv = { ...process.env };

const applyCoreDeprecations = (settings: Record<string, any> = {}) => {
  const deprecations = coreDeprecationProvider(configDeprecationFactory);
  const deprecationMessages: string[] = [];
  const migrated = applyDeprecations(
    settings,
    deprecations.map(deprecation => ({
      deprecation,
      path: '',
    })),
    msg => deprecationMessages.push(msg)
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
          "Environment variable CONFIG_PATH is deprecated. It has been replaced with KIBANA_PATH_CONF pointing to a config folder",
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

  describe('elasticsearchUsernameDeprecation', () => {
    it('logs a warning if elasticsearch.username is set to "elastic"', () => {
      const { messages } = applyCoreDeprecations({
        elasticsearch: {
          username: 'elastic',
        },
      });
      expect(messages).toMatchInlineSnapshot(`
        Array [
          "Setting elasticsearch.username to \\"elastic\\" is deprecated. You should use the \\"kibana\\" user instead.",
        ]
      `);
    });

    it('does not log a warning if elasticsearch.username is set to something besides "elastic"', () => {
      const { messages } = applyCoreDeprecations({
        elasticsearch: {
          username: 'otheruser',
        },
      });
      expect(messages).toHaveLength(0);
    });

    it('does not log a warning if elasticsearch.username is unset', () => {
      const { messages } = applyCoreDeprecations({
        elasticsearch: {},
      });
      expect(messages).toHaveLength(0);
    });
  });
});
