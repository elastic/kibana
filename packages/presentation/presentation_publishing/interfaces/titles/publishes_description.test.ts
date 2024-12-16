/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { getDescription } from './publishes_description';

describe('getDescription', () => {
  test('should return default description when description is undefined', () => {
    const api = {
      description$: new BehaviorSubject<string | undefined>(undefined),
      defaultDescription$: new BehaviorSubject<string | undefined>('default description'),
    };
    expect(getDescription(api)).toBe('default description');
  });

  test('should return empty description when description is empty string', () => {
    const api = {
      description$: new BehaviorSubject<string | undefined>(''),
      defaultDescription$: new BehaviorSubject<string | undefined>('default description'),
    };
    expect(getDescription(api)).toBe('');
  });

  test('should return description when description is provided', () => {
    const api = {
      description$: new BehaviorSubject<string | undefined>('custom description'),
      defaultDescription$: new BehaviorSubject<string | undefined>('default description'),
    };
    expect(getDescription(api)).toBe('custom description');
  });
});
