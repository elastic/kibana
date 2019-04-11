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
import sinon from 'sinon';
import { unused } from '../unused';

describe('deprecation/deprecations', function () {
  describe('unused', function () {
    it('should remove unused setting', function () {
      const settings = {
        old: true
      };

      unused('old')(settings);
      expect(settings.old).to.be(undefined);
    });

    it(`shouldn't remove used setting`, function () {
      const value = 'value';
      const settings = {
        new: value
      };

      unused('old')(settings);
      expect(settings.new).to.be(value);
    });

    it('should remove unused setting, even when null', function () {
      const settings = {
        old: null
      };

      unused('old')(settings);
      expect(settings.old).to.be(undefined);
    });

    it('should log when removing unused setting', function () {
      const settings = {
        old: true
      };

      const log = sinon.spy();
      unused('old')(settings, log);

      expect(log.calledOnce).to.be(true);
      expect(log.args[0][0]).to.match(/old.+deprecated/);
    });

    it(`shouldn't log when no setting is unused`, function () {
      const settings = {
        new: true
      };

      const log = sinon.spy();
      unused('old')(settings, log);
      expect(log.called).to.be(false);
    });
  });
});
