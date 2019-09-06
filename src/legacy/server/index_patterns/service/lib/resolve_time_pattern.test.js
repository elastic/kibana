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

/* eslint import/no-duplicates: 0 */
import sinon from 'sinon';
import { noop } from 'lodash';

import { callIndexAliasApi } from './es_api';
import * as callIndexAliasApiNS from './es_api';
import { timePatternToWildcard } from './time_pattern_to_wildcard';
import * as timePatternToWildcardNS from './time_pattern_to_wildcard';

import { resolveTimePattern } from './resolve_time_pattern';

const TIME_PATTERN = '[logs-]dddd-YYYY.w';

describe('server/index_patterns/service/lib/resolve_time_pattern', () => {
  let sandbox;
  beforeEach(() => (sandbox = sinon.createSandbox()));
  afterEach(() => sandbox.restore());

  describe('resolveTimePattern()', () => {
    describe('pre request', () => {
      it('uses callIndexAliasApi() fn', async () => {
        sandbox.stub(callIndexAliasApiNS, 'callIndexAliasApi').returns({});
        await resolveTimePattern(noop, TIME_PATTERN);
        sinon.assert.calledOnce(callIndexAliasApi);
      });

      it('converts the time pattern to a wildcard with timePatternToWildcard', async () => {
        const timePattern = {};
        const wildcard = {};

        sandbox.stub(timePatternToWildcardNS, 'timePatternToWildcard').returns(wildcard);

        await resolveTimePattern(noop, timePattern);
        sinon.assert.calledOnce(timePatternToWildcard);
        expect(timePatternToWildcard.firstCall.args).toEqual([timePattern]);
      });

      it('passes the converted wildcard as the index to callIndexAliasApi()', async () => {
        const timePattern = {};
        const wildcard = {};

        sandbox.stub(callIndexAliasApiNS, 'callIndexAliasApi').returns({});
        sandbox.stub(timePatternToWildcardNS, 'timePatternToWildcard').returns(wildcard);

        await resolveTimePattern(noop, timePattern);
        sinon.assert.calledOnce(callIndexAliasApi);
        expect(callIndexAliasApi.firstCall.args[1]).toBe(wildcard);
      });
    });

    describe('read response', () => {
      it('returns all aliases names in result.all, ordered by time desc', async () => {
        sandbox.stub(callIndexAliasApiNS, 'callIndexAliasApi').returns({
          'logs-2016.2': {},
          'logs-Saturday-2017.1': {},
          'logs-2016.1': {},
          'logs-Sunday-2017.1': {},
          'logs-2015': {},
          'logs-2016.3': {},
          'logs-Friday-2017.1': {},
        });

        const resp = await resolveTimePattern(noop, TIME_PATTERN);
        expect(resp).toHaveProperty('all');
        expect(resp.all).toEqual([
          'logs-Saturday-2017.1',
          'logs-Friday-2017.1',
          'logs-Sunday-2017.1',
          'logs-2016.3',
          'logs-2016.2',
          'logs-2016.1',
          'logs-2015',
        ]);
      });

      it('returns all indices matching the time pattern in matches, ordered by time desc', async () => {
        sandbox.stub(callIndexAliasApiNS, 'callIndexAliasApi').returns({
          'logs-2016.2': {},
          'logs-Saturday-2017.1': {},
          'logs-2016.1': {},
          'logs-Sunday-2017.1': {},
          'logs-2015': {},
          'logs-2016.3': {},
          'logs-Friday-2017.1': {},
        });

        const resp = await resolveTimePattern(noop, TIME_PATTERN);
        expect(resp).toHaveProperty('matches');
        expect(resp.matches).toEqual([
          'logs-Saturday-2017.1',
          'logs-Friday-2017.1',
          'logs-Sunday-2017.1',
        ]);
      });
    });
  });
});
