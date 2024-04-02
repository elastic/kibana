/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { getPanelTitle } from './publishes_panel_title';

describe('getPanelTitle', () => {
  test('should return default title when title is undefined', () => {
    const api = {
      panelTitle: new BehaviorSubject<string | undefined>(undefined),
      defaultPanelTitle: new BehaviorSubject<string | undefined>('default title'),
    };
    expect(getPanelTitle(api)).toBe('default title');
  });

  test('should return default title when title is empty string', () => {
    const api = {
      panelTitle: new BehaviorSubject<string | undefined>(''),
      defaultPanelTitle: new BehaviorSubject<string | undefined>('default title'),
    };
    expect(getPanelTitle(api)).toBe('default title');
  });

  test('should return title when title is provided', () => {
    const api = {
      panelTitle: new BehaviorSubject<string | undefined>('custom title'),
      defaultPanelTitle: new BehaviorSubject<string | undefined>('default title'),
    };
    expect(getPanelTitle(api)).toBe('custom title');
  });
});
