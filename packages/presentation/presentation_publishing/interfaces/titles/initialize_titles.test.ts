/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { initializeTitles, SerializedTitles } from './initialize_titles';

describe('titles api', () => {
  const rawState: SerializedTitles = {
    title: 'very cool title',
    description: 'less cool description',
    hideTitle: false,
  };

  it('should initialize publishing subjects with the provided rawState', () => {
    const { titlesApi } = initializeTitles(rawState);
    expect(titlesApi.title$.value).toBe(rawState.title);
    expect(titlesApi.description$.value).toBe(rawState.description);
    expect(titlesApi.hideTitle$.value).toBe(rawState.hideTitle);
  });

  it('should update publishing subject values when set functions are called', () => {
    const { titlesApi } = initializeTitles(rawState);

    titlesApi.setTitle('even cooler title');
    titlesApi.setDescription('super uncool description');
    titlesApi.setHideTitle(true);

    expect(titlesApi.title$.value).toEqual('even cooler title');
    expect(titlesApi.description$.value).toEqual('super uncool description');
    expect(titlesApi.hideTitle$.value).toBe(true);
  });

  it('should correctly serialize current state', () => {
    const { serializeTitles, titlesApi } = initializeTitles(rawState);
    titlesApi.setTitle('UH OH, A TITLE');

    const serializedTitles = serializeTitles();
    expect(serializedTitles).toMatchInlineSnapshot(`
        Object {
          "description": "less cool description",
          "hideTitle": false,
          "title": "UH OH, A TITLE",
        }
      `);
  });

  it('should return the correct set of comparators', () => {
    const { titleComparators } = initializeTitles(rawState);

    expect(titleComparators.title).toBeDefined();
    expect(titleComparators.description).toBeDefined();
    expect(titleComparators.hideTitle).toBeDefined();
  });

  it('should correctly compare hideTitle with custom comparator', () => {
    const { titleComparators } = initializeTitles(rawState);

    expect(titleComparators.hideTitle![2]!(true, false)).toBe(false);
    expect(titleComparators.hideTitle![2]!(undefined, false)).toBe(true);
    expect(titleComparators.hideTitle![2]!(true, undefined)).toBe(false);
  });
});
