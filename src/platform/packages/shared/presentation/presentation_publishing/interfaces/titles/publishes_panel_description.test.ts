/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { getPanelDescription } from './publishes_panel_description';

describe('getPanelDescription', () => {
  test('should return default description when description is undefined', () => {
    const api = {
      panelDescription: new BehaviorSubject<string | undefined>(undefined),
      defaultPanelDescription: new BehaviorSubject<string | undefined>('default description'),
    };
    expect(getPanelDescription(api)).toBe('default description');
  });

  test('should return empty description when description is empty string', () => {
    const api = {
      panelDescription: new BehaviorSubject<string | undefined>(''),
      defaultPanelDescription: new BehaviorSubject<string | undefined>('default description'),
    };
    expect(getPanelDescription(api)).toBe('');
  });

  test('should return description when description is provided', () => {
    const api = {
      panelDescription: new BehaviorSubject<string | undefined>('custom description'),
      defaultPanelDescription: new BehaviorSubject<string | undefined>('default description'),
    };
    expect(getPanelDescription(api)).toBe('custom description');
  });
});
