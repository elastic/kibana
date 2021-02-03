/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import hits from 'fixtures/real_hits';

export default {
  took: 73,
  timed_out: false,
  _shards: {
    total: 144,
    successful: 144,
    failed: 0,
  },
  hits: {
    total: 49487,
    max_score: 1.0,
    hits: hits,
  },
};
