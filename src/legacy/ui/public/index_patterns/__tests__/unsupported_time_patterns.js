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

import ngMock from 'ng_mock';
import expect from '@kbn/expect';
import Chance from 'chance';

import { Storage } from '../../storage';
import { StubBrowserStorage } from 'test_utils/stub_browser_storage';
import StubIndexPatternProvider from 'test_utils/stub_index_pattern';
import { IsUserAwareOfUnsupportedTimePatternProvider } from '../unsupported_time_patterns';

const chance = new Chance();
const CONFIG_KEY = 'indexPatterns:warnAboutUnsupportedTimePatterns';

describe('isUserAwareOfUnsupportedTimePattern()', () => {
  let setup;

  beforeEach(function () {
    setup = () => {
      const store = new StubBrowserStorage();
      const sessionStorage = new Storage(store);

      // stub some core services
      ngMock.module('kibana', $provide => {
        $provide.value('sessionStorage', sessionStorage);
      });
      // trigger creation of the injector
      ngMock.inject();

      const { $injector } = this;
      const Private = $injector.get('Private');
      const StubIndexPattern = Private(StubIndexPatternProvider);
      const isUserAwareOfUnsupportedTimePattern = Private(IsUserAwareOfUnsupportedTimePatternProvider);

      const config = $injector.get('config');
      config.set(CONFIG_KEY, true); // enable warnings

      return {
        config,
        createIndexPattern: () => new StubIndexPattern(chance.word(), null, []),
        isUserAwareOfUnsupportedTimePattern,
      };
    };
  });

  it('only warns once per index pattern', () => {
    const {
      createIndexPattern,
      isUserAwareOfUnsupportedTimePattern,
    } = setup();

    const indexPattern1 = createIndexPattern();
    const indexPattern2 = createIndexPattern();

    expect(isUserAwareOfUnsupportedTimePattern(indexPattern1)).to.be(false);
    expect(isUserAwareOfUnsupportedTimePattern(indexPattern1)).to.be(true);
    expect(isUserAwareOfUnsupportedTimePattern(indexPattern2)).to.be(false);
    expect(isUserAwareOfUnsupportedTimePattern(indexPattern1)).to.be(true);
    expect(isUserAwareOfUnsupportedTimePattern(indexPattern2)).to.be(true);
    expect(isUserAwareOfUnsupportedTimePattern(indexPattern1)).to.be(true);
  });

  describe('ui config', () => {
    it('respects setting', () => {
      const {
        config,
        isUserAwareOfUnsupportedTimePattern,
        createIndexPattern,
      } = setup();

      config.set(CONFIG_KEY, false);
      expect(isUserAwareOfUnsupportedTimePattern(createIndexPattern())).to.be(true);

      config.set(CONFIG_KEY, true);
      expect(isUserAwareOfUnsupportedTimePattern(createIndexPattern())).to.be(false);
    });
  });
});
