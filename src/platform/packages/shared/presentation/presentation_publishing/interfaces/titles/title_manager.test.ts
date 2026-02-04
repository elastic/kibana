/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComparatorFunction } from '../../state_manager';
import type { SerializedTitles } from './title_manager';
import { initializeTitleManager, titleComparators } from './title_manager';

describe('titles api', () => {
  const initialTitles: SerializedTitles = {
    title: 'very cool title',
    description: 'less cool description',
    hide_title: false,
  };

  it('should initialize publishing subjects from initialState', () => {
    const { api } = initializeTitleManager(initialTitles);
    expect(api.title$.value).toBe(initialTitles.title);
    expect(api.description$.value).toBe(initialTitles.description);
    expect(api.hideTitle$.value).toBe(initialTitles.hide_title);
  });

  it('should update publishing subject values when set functions are called', () => {
    const { api } = initializeTitleManager(initialTitles);

    api.setTitle('even cooler title');
    api.setDescription('super uncool description');
    api.setHideTitle(true);

    expect(api.title$.value).toEqual('even cooler title');
    expect(api.description$.value).toEqual('super uncool description');
    expect(api.hideTitle$.value).toBe(true);
  });

  it('should correctly serialize current state', () => {
    const titleManager = initializeTitleManager(initialTitles);
    titleManager.api.setTitle('UH OH, A TITLE');

    const serializedTitles = titleManager.getLatestState();
    expect(serializedTitles).toMatchInlineSnapshot(`
        Object {
          "description": "less cool description",
          "hide_title": false,
          "title": "UH OH, A TITLE",
        }
      `);
  });

  it('should correctly compare hide_title with custom comparator', () => {
    const comparator = titleComparators.hide_title as ComparatorFunction<
      SerializedTitles,
      'hide_title'
    >;
    expect(comparator(true, false)).toBe(false);
    expect(comparator(undefined, false)).toBe(true);
    expect(comparator(true, undefined)).toBe(false);
  });
});
