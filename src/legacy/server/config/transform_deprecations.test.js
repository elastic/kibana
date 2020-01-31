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

import sinon from 'sinon';
import { transformDeprecations } from './transform_deprecations';

describe('server/config', function() {
  describe('transformDeprecations', function() {
    describe('savedObjects.indexCheckTimeout', () => {
      it('removes the indexCheckTimeout and savedObjects properties', () => {
        const settings = {
          savedObjects: {
            indexCheckTimeout: 123,
          },
        };

        expect(transformDeprecations(settings)).toEqual({});
      });

      it('keeps the savedObjects property if it has other keys', () => {
        const settings = {
          savedObjects: {
            indexCheckTimeout: 123,
            foo: 'bar',
          },
        };

        expect(transformDeprecations(settings)).toEqual({
          savedObjects: {
            foo: 'bar',
          },
        });
      });

      it('logs that the setting is no longer necessary', () => {
        const settings = {
          savedObjects: {
            indexCheckTimeout: 123,
          },
        };

        const log = sinon.spy();
        transformDeprecations(settings, log);
        sinon.assert.calledOnce(log);
        sinon.assert.calledWithExactly(log, sinon.match('savedObjects.indexCheckTimeout'));
      });
    });

    describe('csp.rules', () => {
      describe('with nonce source', () => {
        it('logs a warning', () => {
          const settings = {
            csp: {
              rules: [`script-src 'self' 'nonce-{nonce}'`],
            },
          };

          const log = jest.fn();
          transformDeprecations(settings, log);
          expect(log.mock.calls).toMatchInlineSnapshot(`
                        Array [
                          Array [
                            "csp.rules no longer supports the {nonce} syntax. Replacing with 'self' in script-src",
                          ],
                        ]
                    `);
        });

        it('replaces a nonce', () => {
          expect(
            transformDeprecations({ csp: { rules: [`script-src 'nonce-{nonce}'`] } }, jest.fn()).csp
              .rules
          ).toEqual([`script-src 'self'`]);
          expect(
            transformDeprecations(
              { csp: { rules: [`script-src 'unsafe-eval' 'nonce-{nonce}'`] } },
              jest.fn()
            ).csp.rules
          ).toEqual([`script-src 'unsafe-eval' 'self'`]);
        });

        it('removes a quoted nonce', () => {
          expect(
            transformDeprecations(
              { csp: { rules: [`script-src 'self' 'nonce-{nonce}'`] } },
              jest.fn()
            ).csp.rules
          ).toEqual([`script-src 'self'`]);
          expect(
            transformDeprecations(
              { csp: { rules: [`script-src 'nonce-{nonce}' 'self'`] } },
              jest.fn()
            ).csp.rules
          ).toEqual([`script-src 'self'`]);
        });

        it('removes a non-quoted nonce', () => {
          expect(
            transformDeprecations(
              { csp: { rules: [`script-src 'self' nonce-{nonce}`] } },
              jest.fn()
            ).csp.rules
          ).toEqual([`script-src 'self'`]);
          expect(
            transformDeprecations(
              { csp: { rules: [`script-src nonce-{nonce} 'self'`] } },
              jest.fn()
            ).csp.rules
          ).toEqual([`script-src 'self'`]);
        });

        it('removes a strange nonce', () => {
          expect(
            transformDeprecations(
              { csp: { rules: [`script-src 'self' blah-{nonce}-wow`] } },
              jest.fn()
            ).csp.rules
          ).toEqual([`script-src 'self'`]);
        });

        it('removes multiple nonces', () => {
          expect(
            transformDeprecations(
              {
                csp: {
                  rules: [
                    `script-src 'nonce-{nonce}' 'self' blah-{nonce}-wow`,
                    `style-src 'nonce-{nonce}' 'self'`,
                  ],
                },
              },
              jest.fn()
            ).csp.rules
          ).toEqual([`script-src 'self'`, `style-src 'self'`]);
        });
      });

      describe('without self source', () => {
        it('logs a warning', () => {
          const log = jest.fn();
          transformDeprecations({ csp: { rules: [`script-src 'unsafe-eval'`] } }, log);
          expect(log.mock.calls).toMatchInlineSnapshot(`
                        Array [
                          Array [
                            "csp.rules must contain the 'self' source. Automatically adding to script-src.",
                          ],
                        ]
                    `);
        });

        it('adds self', () => {
          expect(
            transformDeprecations({ csp: { rules: [`script-src 'unsafe-eval'`] } }, jest.fn()).csp
              .rules
          ).toEqual([`script-src 'unsafe-eval' 'self'`]);
        });
      });

      it('does not add self to other policies', () => {
        expect(
          transformDeprecations({ csp: { rules: [`worker-src blob:`] } }, jest.fn()).csp.rules
        ).toEqual([`worker-src blob:`]);
      });
    });
  });
});
