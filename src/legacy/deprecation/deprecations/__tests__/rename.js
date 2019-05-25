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

import expect from '@kbn/expect';
import { rename } from '../rename';
import sinon from 'sinon';

describe('deprecation/deprecations', function () {
  describe('rename', function () {
    it('should rename simple property', function () {
      const value = 'value';
      const settings = {
        before: value
      };

      rename('before', 'after')(settings);
      expect(settings.before).to.be(undefined);
      expect(settings.after).to.be(value);
    });

    it ('should rename nested property', function () {
      const value = 'value';
      const settings = {
        someObject: {
          before: value
        }
      };

      rename('someObject.before', 'someObject.after')(settings);
      expect(settings.someObject.before).to.be(undefined);
      expect(settings.someObject.after).to.be(value);
    });

    it ('should rename property, even when the value is null', function () {
      const value = null;
      const settings = {
        before: value
      };

      rename('before', 'after')(settings);
      expect(settings.before).to.be(undefined);
      expect(settings.after).to.be(null);
    });

    it (`shouldn't log when a rename doesn't occur`, function () {
      const settings = {
        exists: true
      };

      const log = sinon.spy();
      rename('doesntExist', 'alsoDoesntExist')(settings, log);
      expect(log.called).to.be(false);
    });

    it ('should log when a rename does occur', function () {
      const settings = {
        exists: true
      };

      const log = sinon.spy();
      rename('exists', 'alsoExists')(settings, log);

      expect(log.calledOnce).to.be(true);
      expect(log.args[0][0]).to.match(/exists.+deprecated/);
    });
  });
});
