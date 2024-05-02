/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { initializeTitles, SerializedTitles } from './titles_api';

describe('titles api', () => {
  const rawState: SerializedTitles = {
    title: 'very cool title',
    description: 'less cool description',
    hidePanelTitles: false,
  };

  it('should initialize publishing subjects with the provided rawState', () => {
    const { titlesApi } = initializeTitles(rawState);
    expect(titlesApi.panelTitle.value).toBe(rawState.title);
    expect(titlesApi.panelDescription.value).toBe(rawState.description);
    expect(titlesApi.hidePanelTitle.value).toBe(rawState.hidePanelTitles);
  });

  it('should update publishing subject values when set functions are called', () => {
    const { titlesApi } = initializeTitles(rawState);

    titlesApi.setPanelTitle('even cooler title');
    titlesApi.setPanelDescription('super uncool description');
    titlesApi.setHidePanelTitle(true);

    expect(titlesApi.panelTitle.value).toEqual('even cooler title');
    expect(titlesApi.panelDescription.value).toEqual('super uncool description');
    expect(titlesApi.hidePanelTitle.value).toBe(true);
  });

  it('should correctly serialize current state', () => {
    const { serializeTitles, titlesApi } = initializeTitles(rawState);
    titlesApi.setPanelTitle('UH OH, A TITLE');

    const serializedTitles = serializeTitles();
    expect(serializedTitles).toMatchInlineSnapshot(`
        Object {
          "description": "less cool description",
          "hidePanelTitles": false,
          "title": "UH OH, A TITLE",
        }
      `);
  });

  it('should return the correct set of comparators', () => {
    const { titleComparators } = initializeTitles(rawState);

    expect(titleComparators.title).toBeDefined();
    expect(titleComparators.description).toBeDefined();
    expect(titleComparators.hidePanelTitles).toBeDefined();
  });

  it('should correctly compare hidePanelTitles with custom comparator', () => {
    const { titleComparators } = initializeTitles(rawState);

    expect(titleComparators.hidePanelTitles![2]!(true, false)).toBe(false);
    expect(titleComparators.hidePanelTitles![2]!(undefined, false)).toBe(true);
    expect(titleComparators.hidePanelTitles![2]!(true, undefined)).toBe(false);
  });
});
