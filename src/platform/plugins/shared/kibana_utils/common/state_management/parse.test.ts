/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseUrlHash } from './parse';

describe('parseUrlHash', () => {
  it('should return null if no hash', () => {
    expect(parseUrlHash('http://localhost:5601/oxf/app/kibana')).toBeNull();
  });

  it('should return parsed hash', () => {
    expect(parseUrlHash('http://localhost:5601/oxf/app/kibana/#/path?test=test')).toMatchObject({
      pathname: '/path',
      query: {
        test: 'test',
      },
    });
  });
});
