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

import { createTransform } from '../create_transform';
import expect from '@kbn/expect';
import sinon from 'sinon';

describe('deprecation', function () {
  describe('createTransform', function () {
    it(`doesn't modify settings parameter`, function () {
      const settings = {
        original: true
      };
      const deprecations = [(settings) => {
        settings.original = false;
      }];
      createTransform(deprecations)(settings);
      expect(settings.original).to.be(true);
    });

    it('calls single deprecation in array', function () {
      const deprecations = [sinon.spy()];
      createTransform(deprecations)({});
      expect(deprecations[0].calledOnce).to.be(true);
    });

    it('calls multiple deprecations in array', function () {
      const deprecations = [sinon.spy(), sinon.spy()];
      createTransform(deprecations)({});
      expect(deprecations[0].calledOnce).to.be(true);
      expect(deprecations[1].calledOnce).to.be(true);
    });

    it('passes log function to deprecation', function () {
      const deprecation = sinon.spy();
      const log = function () {};
      createTransform([deprecation])({}, log);
      expect(deprecation.args[0][1]).to.be(log);
    });
  });
});
