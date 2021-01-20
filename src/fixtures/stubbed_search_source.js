/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import sinon from 'sinon';
import searchResponse from 'fixtures/search_response';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

export default function stubSearchSource(Private, $q, Promise) {
  let deferedResult = $q.defer();
  const indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

  let onResultsCount = 0;
  return {
    setField: sinon.spy(),
    fetch: sinon.spy(),
    destroy: sinon.spy(),
    getField: function (param) {
      switch (param) {
        case 'index':
          return indexPattern;
        default:
          throw new Error(`Param "${param}" is not implemented in the stubbed search source`);
      }
    },
    crankResults: function () {
      deferedResult.resolve(searchResponse);
      deferedResult = $q.defer();
    },
    onResults: function () {
      onResultsCount++;

      // Up to the test to resolve this manually
      // For example:
      // someHandler.resolve(require('fixtures/search_response'))
      return deferedResult.promise;
    },
    getOnResultsCount: function () {
      return onResultsCount;
    },
    _flatten: function () {
      return Promise.resolve({ index: indexPattern, body: {} });
    },
    _requestStartHandlers: [],
    onRequestStart(fn) {
      this._requestStartHandlers.push(fn);
    },
    requestIsStopped() {},
  };
}
