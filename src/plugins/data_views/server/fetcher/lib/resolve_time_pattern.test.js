/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  const esClientMock = {
    indices: {
      getAlias: () => ({}),
    },
  };
  beforeEach(() => (sandbox = sinon.createSandbox()));
  afterEach(() => sandbox.restore());

  describe('resolveTimePattern()', () => {
    describe('pre request', () => {
      it('uses callIndexAliasApi() fn', async () => {
        sandbox.stub(callIndexAliasApiNS, 'callIndexAliasApi').returns({});
        await resolveTimePattern(esClientMock, TIME_PATTERN);
        sinon.assert.calledOnce(callIndexAliasApi);
      });

      it('converts the time pattern to a wildcard with timePatternToWildcard', async () => {
        const timePattern = {};
        const wildcard = {};

        sandbox.stub(timePatternToWildcardNS, 'timePatternToWildcard').returns(wildcard);

        await resolveTimePattern(esClientMock, timePattern);
        sinon.assert.calledOnce(timePatternToWildcard);
        expect(timePatternToWildcard.firstCall.args).toEqual([timePattern]);
      });

      it('passes the converted wildcard as the index to callIndexAliasApi()', async () => {
        const timePattern = {};
        const wildcard = {};

        sandbox.stub(callIndexAliasApiNS, 'callIndexAliasApi').returns({});
        sandbox.stub(timePatternToWildcardNS, 'timePatternToWildcard').returns(wildcard);

        await resolveTimePattern(esClientMock, timePattern);
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
