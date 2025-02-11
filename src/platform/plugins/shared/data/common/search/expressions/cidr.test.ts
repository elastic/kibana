/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { functionWrapper } from './utils';
import { cidrFunction } from './cidr';

describe('interpreter/functions#cidr', () => {
  const fn = functionWrapper(cidrFunction);

  it('should return a CIDR structure', () => {
    expect(fn(null, { mask: '0.0.0.0/0' })).toEqual(
      expect.objectContaining({
        mask: '0.0.0.0/0',
        type: 'cidr',
      })
    );
  });
});
