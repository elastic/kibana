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

import { Deprecations } from '../../../deprecation';
import index from './index';
import { compact, noop, set } from 'lodash';

describe('plugins/elasticsearch', function () {
  describe('#deprecations()', function () {
    let transformDeprecations;

    beforeAll(function () {
      const Plugin = function (options) {
        this.deprecations = options.deprecations;
      };

      const plugin = index({ Plugin });

      const deprecations = plugin.deprecations(Deprecations);
      transformDeprecations = (settings, log = noop) => {
        deprecations.forEach(deprecation => deprecation(settings, log));
      };
    });

    describe('tribe.*', () => {
      let log;

      beforeEach(() => log = jest.fn());

      it(`doesn't log when there are no settings`, () => {
        transformDeprecations(null, log);
        expect(log).not.toHaveBeenCalled();
      });

      it(`doesn't log when there are no tribe settings`, () => {
        transformDeprecations({}, log);
        expect(log).not.toHaveBeenCalled();
      });

      it(`doesn't log when there are empty tribe settings`, () => {
        transformDeprecations({ tribe: {} }, log);
        expect(log).not.toHaveBeenCalled();
      });

      it(`logs when there are any tribe settings`, () => {
        transformDeprecations({ tribe: { url: '' } }, log);
        expect(log).toHaveBeenCalled();
      });
    });

    [null, 'tribe'].forEach((basePath) => {
      const getKey = (path) => {
        return compact([basePath, path]).join('.');
      };

      describe(`${getKey('ssl.verificationMode')}`, function () {
        let settings;
        let sslSettings;

        beforeEach(function () {
          settings = { tribe: { username: '' } };
          sslSettings = {};
          set(settings, getKey('ssl'), sslSettings);
        });

        it(`sets verificationMode to none when verify is false`, function () {
          sslSettings.verify = false;

          transformDeprecations(settings);
          expect(sslSettings.verificationMode).toBe('none');
          expect(sslSettings.verify).toBe(undefined);
        });

        it('should log when deprecating verify from false', function () {
          sslSettings.verify = false;

          const log = jest.fn();
          transformDeprecations(settings, log);
          const expLogMsg = `Config key "${getKey('ssl.verify')}" is deprecated. It has been replaced with ` +
            `"${getKey('ssl.verificationMode')}"`;
          expect(log).toHaveBeenCalledWith(expLogMsg);
        });

        it('sets verificationMode to full when verify is true', function () {
          sslSettings.verify = true;

          transformDeprecations(settings);
          expect(sslSettings.verificationMode).toBe('full');
          expect(sslSettings.verify).toBe(undefined);
        });

        it('should log when deprecating verify from true', function () {
          sslSettings.verify = true;

          const log = jest.fn();
          transformDeprecations(settings, log);
          const expLogMsg = `Config key "${getKey('ssl.verify')}" is deprecated. It has been replaced with ` +
            `"${getKey('ssl.verificationMode')}"`;
          expect(log).toHaveBeenCalledWith(expLogMsg);
        });

        it(`shouldn't set verificationMode when verify isn't present`, function () {
          transformDeprecations(settings);
          expect(sslSettings.verificationMode).toBe(undefined);
        });

        it(`shouldn't log when verify isn't present`, function () {
          const log = jest.fn();
          transformDeprecations(settings, log);
          const expLogMsg = `Config key "${getKey('ssl.verify')}" is deprecated. It has been replaced with ` +
            `"${getKey('ssl.verificationMode')}"`;
          expect(log).not.toHaveBeenCalledWith(expLogMsg);
        });
      });
    });
  });
});
