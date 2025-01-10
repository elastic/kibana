/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { initializeTitleManager, SerializedTitles } from './title_manager';

describe('titles api', () => {
  const rawState: SerializedTitles = {
    title: 'very cool title',
    description: 'less cool description',
    hidePanelTitles: false,
  };

  it('should initialize publishing subjects with the provided rawState', () => {
    const { api } = initializeTitleManager(rawState);
    expect(api.title$.value).toBe(rawState.title);
    expect(api.description$.value).toBe(rawState.description);
    expect(api.hideTitle$.value).toBe(rawState.hidePanelTitles);
  });

  it('should update publishing subject values when set functions are called', () => {
    const { api } = initializeTitleManager(rawState);

    api.setTitle('even cooler title');
    api.setDescription('super uncool description');
    api.setHideTitle(true);

    expect(api.title$.value).toEqual('even cooler title');
    expect(api.description$.value).toEqual('super uncool description');
    expect(api.hideTitle$.value).toBe(true);
  });

  it('should correctly serialize current state', () => {
    const titleManager = initializeTitleManager(rawState);
    titleManager.api.setTitle('UH OH, A TITLE');

    const serializedTitles = titleManager.serialize();
    expect(serializedTitles).toMatchInlineSnapshot(`
        Object {
          "description": "less cool description",
          "hidePanelTitles": false,
          "title": "UH OH, A TITLE",
        }
      `);
  });

  it('should return the correct set of comparators', () => {
    const { comparators } = initializeTitleManager(rawState);

    expect(comparators.title).toBeDefined();
    expect(comparators.description).toBeDefined();
    expect(comparators.hidePanelTitles).toBeDefined();
  });

  it('should correctly compare hidePanelTitles with custom comparator', () => {
    const { comparators } = initializeTitleManager(rawState);

    expect(comparators.hidePanelTitles![2]!(true, false)).toBe(false);
    expect(comparators.hidePanelTitles![2]!(undefined, false)).toBe(true);
    expect(comparators.hidePanelTitles![2]!(true, undefined)).toBe(false);
  });
});
