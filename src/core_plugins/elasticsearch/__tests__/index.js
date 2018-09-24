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
import expect from 'expect.js';
import index from '../index';
import { noop, set } from 'lodash';
import sinon from 'sinon';

describe('plugins/elasticsearch', function () {
  describe('#deprecations()', function () {
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

    describe('ssl.verificationMode', function () {
      let settings;
      let sslSettings;

      beforeEach(function () {
        settings = {};
        sslSettings = {};
        set(settings, 'ssl', sslSettings);
      });

      it(`sets verificationMode to none when verify is false`, function () {
        sslSettings.verify = false;

        transformDeprecations(settings);
        expect(sslSettings.verificationMode).to.be('none');
        expect(sslSettings.verify).to.be(undefined);
      });

      it('should log when deprecating verify from false', function () {
        sslSettings.verify = false;

        const log = sinon.spy();
        transformDeprecations(settings, log);
        expect(log.calledOnce).to.be(true);
      });

      it('sets verificationMode to full when verify is true', function () {
        sslSettings.verify = true;

        transformDeprecations(settings);
        expect(sslSettings.verificationMode).to.be('full');
        expect(sslSettings.verify).to.be(undefined);
      });

      it('should log when deprecating verify from true', function () {
        sslSettings.verify = true;

        const log = sinon.spy();
        transformDeprecations(settings, log);
        expect(log.calledOnce).to.be(true);
      });

      it(`shouldn't set verificationMode when verify isn't present`, function () {
        transformDeprecations(settings);
        expect(sslSettings.verificationMode).to.be(undefined);
      });

      it(`shouldn't log when verify isn't present`, function () {
        const log = sinon.spy();
        transformDeprecations(settings, log);
        expect(log.called).to.be(false);
      });
    });
  });
});
