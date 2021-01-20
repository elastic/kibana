/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import sinon from 'sinon';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

export default function (Private) {
  const indexPatterns = Private(FixturesStubbedLogstashIndexPatternProvider);
  const getIndexPatternStub = sinon.stub().resolves(indexPatterns);

  return {
    get: getIndexPatternStub,
  };
}
