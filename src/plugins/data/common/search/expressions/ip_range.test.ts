/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { functionWrapper } from './utils';
import { ipRangeFunction } from './ip_range';

describe('interpreter/functions#ipRange', () => {
  const fn = functionWrapper(ipRangeFunction);

  it('should return an IP range structure', () => {
    expect(fn(null, { from: '0.0.0.0', to: '128.0.0.0' })).toEqual(
      expect.objectContaining({
        from: '0.0.0.0',
        to: '128.0.0.0',
        type: 'ip_range',
      })
    );
  });
});
