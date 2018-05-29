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

describe('server/config', function () {
  describe('transformDeprecations', function () {
    describe('server.ssl.enabled', function () {
      it('sets enabled to true when certificate and key are set', function () {
        const settings = {
          server: {
            ssl: {
              certificate: '/cert.crt',
              key: '/key.key'
            }
          }
        };

        const result = transformDeprecations(settings);
        expect(result.server.ssl.enabled).toBe(true);
      });

      it('logs a message when automatically setting enabled to true', function () {
        const settings = {
          server: {
            ssl: {
              certificate: '/cert.crt',
              key: '/key.key'
            }
          }
        };

        const log = sinon.spy();
        transformDeprecations(settings, log);
        expect(log.calledOnce).toBe(true);
      });

      it(`doesn't set enabled when key and cert aren't set`, function () {
        const settings = {
          server: {
            ssl: {}
          }
        };

        const result = transformDeprecations(settings);
        expect(result.server.ssl.enabled).toBe(undefined);
      });

      it(`doesn't log a message when not automatically setting enabled`, function () {
        const settings = {
          server: {
            ssl: {}
          }
        };

        const log = sinon.spy();
        transformDeprecations(settings, log);
        expect(log.called).toBe(false);
      });
    });

    describe('savedObjects.indexCheckTimeout', () => {
      it('removes the indexCheckTimeout and savedObjects properties', () => {
        const settings = {
          savedObjects: {
            indexCheckTimeout: 123
          }
        };

        expect(transformDeprecations(settings)).toEqual({});
      });

      it('keeps the savedObjects property if it has other keys', () => {
        const settings = {
          savedObjects: {
            indexCheckTimeout: 123,
            foo: 'bar'
          }
        };

        expect(transformDeprecations(settings)).toEqual({
          savedObjects: {
            foo: 'bar'
          }
        });
      });

      it('logs that the setting is no longer necessary', () => {
        const settings = {
          savedObjects: {
            indexCheckTimeout: 123
          }
        };

        const log = sinon.spy();
        transformDeprecations(settings, log);
        sinon.assert.calledOnce(log);
        sinon.assert.calledWithExactly(log, sinon.match('savedObjects.indexCheckTimeout'));
      });
    });
  });
});
