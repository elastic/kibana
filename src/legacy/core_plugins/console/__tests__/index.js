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
import expect from '@kbn/expect';
import index from '../index';
import { noop } from 'lodash';
import sinon from 'sinon';

describe('plugins/console', function () {
  describe('#deprecate()', function () {
    let transformDeprecations;

    before(function () {
      const Plugin = function (options) {
        this.deprecations = options.deprecations;
      };

      const plugin = index({ Plugin });

      const deprecations = plugin.deprecations(Deprecations);
      transformDeprecations = (settings, log = noop) => {
        deprecations.forEach(deprecation => deprecation(settings, log));
      };
    });

    describe('proxyConfig', function () {
      it('leaves the proxyConfig settings', function () {
        const proxyConfigOne = {};
        const proxyConfigTwo = {};
        const settings = {
          proxyConfig: [proxyConfigOne, proxyConfigTwo]
        };

        transformDeprecations(settings);
        expect(settings.proxyConfig[0]).to.be(proxyConfigOne);
        expect(settings.proxyConfig[1]).to.be(proxyConfigTwo);
      });

      it('logs a warning when proxyConfig is specified', function () {
        const settings = {
          proxyConfig: []
        };

        const log = sinon.spy();
        transformDeprecations(settings, log);
        expect(log.calledOnce).to.be(true);
      });

      it(`doesn't log a warning when proxyConfig isn't specified`, function () {
        const settings = {};

        const log = sinon.spy();
        transformDeprecations(settings, log);
        expect(log.called).to.be(false);
      });
    });
  });
});
