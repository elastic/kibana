/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getBucket } from './utils';

describe('getBucket', () => {
  const BUCKET_CONFIG = [
    { to: 1, label: '1' },
    { to: 5, label: '2-5' },
    { to: 20, label: '6-20' },
  ];

  it('returns "0" for a value of 0', () => {
    expect(getBucket(0, BUCKET_CONFIG)).toBe('0');
  });

  it('returns the correct bucket for a value within a bucket', () => {
    expect(getBucket(3, BUCKET_CONFIG)).toBe('2-5');
  });

  it('returns the correct bucket for a value equal to a bucket limit', () => {
    expect(getBucket(5, BUCKET_CONFIG)).toBe('2-5');
  });

  it('returns the correct bucket for a value greater than the last bucket', () => {
    expect(getBucket(21, BUCKET_CONFIG)).toBe('20+');
  });

  it('handles a single bucket config', () => {
    const config = [{ to: 10, label: '1-10' }];
    expect(getBucket(11, config)).toBe('10+');
  });

  it('handles a last bucket label that already ends with +', () => {
    const config = [
      { to: 1, label: '1' },
      { to: 5, label: '2-5' },
      { to: 20, label: '20+' },
    ];
    expect(getBucket(21, config)).toBe('20+');
  });

  it('creates a label for values greater than the last bucket when the last part is not defined', () => {
    const config = [{ to: 10, label: 'ten' }];
    expect(getBucket(11, config)).toBe('10+');
  });
});
