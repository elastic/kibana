/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Scrubber } from './scrubber';

describe('Scrubber', () => {
  it('maps the same value to the same stable label', () => {
    const scrubber = new Scrubber();
    expect(scrubber.label('service', 'checkout')).toBe('service-1');
    expect(scrubber.label('service', 'checkout')).toBe('service-1');
  });

  it('maps distinct values to distinct labels within a category', () => {
    const scrubber = new Scrubber();
    expect(scrubber.label('service', 'checkout')).toBe('service-1');
    expect(scrubber.label('service', 'cart')).toBe('service-2');
  });

  it('keeps categories independent', () => {
    const scrubber = new Scrubber();
    expect(scrubber.label('service', 'checkout')).toBe('service-1');
    expect(scrubber.label('host', 'box-a')).toBe('host-1');
  });
});
