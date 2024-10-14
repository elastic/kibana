/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getNextTab } from './get_next_tab';

const tabs = [
  {
    name: 'Tab0',
    label: 'Tab0',
    component: null,
  },
  {
    name: 'Tab1',
    label: 'Tab1',
    component: null,
  },
  {
    name: 'Tab2',
    label: 'Tab2',
    component: null,
  },
];

describe('getNextTab', () => {
  describe('no currentTab', () => {
    test('should return first tab when preferred tabs are not requested', () => {
      expect(getNextTab(null, tabs)).toEqual(tabs[0]);
    });

    test('should return first preferred tab when available', () => {
      expect(getNextTab(null, tabs, ['tab1'])).toEqual(tabs[1]);
    });

    test('should return second preferred tab when first preferred tab is not available', () => {
      expect(getNextTab(null, tabs, ['notAvailableTabName', 'tab2'])).toEqual(tabs[2]);
    });

    test('should return first tab when all preferred tabs are not available', () => {
      expect(getNextTab(null, tabs, ['notAvailableTabName'])).toEqual(tabs[0]);
    });
  });

  describe('currentTab', () => {
    const currentTab = {
      name: 'noLongerAvailableTab',
      label: 'noLongerAvailableTab',
      component: null,
    };
    test('should return first tab when preferred tabs are not requested', () => {
      expect(getNextTab(currentTab, tabs)).toEqual(tabs[0]);
    });

    test('should ignore preferred tabs and return first tab', () => {
      expect(getNextTab(currentTab, tabs, ['tab1'])).toEqual(tabs[0]);
    });
  });
});
