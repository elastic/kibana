/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { getTitle } from './publishes_title';

describe('getPanelTitle', () => {
  test('should return default title when title is undefined', () => {
    const api = {
      title$: new BehaviorSubject<string | undefined>(undefined),
      defaultTitle$: new BehaviorSubject<string | undefined>('default title'),
    };
    expect(getTitle(api)).toBe('default title');
  });

  test('should return empty title when title is empty string', () => {
    const api = {
      title$: new BehaviorSubject<string | undefined>(''),
      defaultTitle$: new BehaviorSubject<string | undefined>('default title'),
    };
    expect(getTitle(api)).toBe('');
  });

  test('should return title when title is provided', () => {
    const api = {
      title$: new BehaviorSubject<string | undefined>('custom title'),
      defaultTitle$: new BehaviorSubject<string | undefined>('default title'),
    };
    expect(getTitle(api)).toBe('custom title');
  });
});
