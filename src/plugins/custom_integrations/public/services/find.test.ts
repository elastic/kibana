/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { filterCustomIntegrations } from './find';
import { CustomIntegration } from '../../common';

describe('Custom Integrations Find Service', () => {
  const integrations: CustomIntegration[] = [
    {
      id: 'foo',
      title: 'Foo',
      description: 'test integration',
      type: 'ui_link',
      uiInternalPath: '/path/to/foo',
      isBeta: false,
      icons: [],
      categories: ['aws', 'cloud'],
      shipper: 'tests',
    },
    {
      id: 'bar',
      title: 'Bar',
      description: 'test integration',
      type: 'ui_link',
      uiInternalPath: '/path/to/bar',
      isBeta: false,
      icons: [],
      categories: ['aws'],
      shipper: 'other',
      eprOverlap: 'eprValue',
    },
    {
      id: 'bar',
      title: 'Bar',
      description: 'test integration',
      type: 'ui_link',
      uiInternalPath: '/path/to/bar',
      isBeta: false,
      icons: [],
      categories: ['cloud'],
      shipper: 'other',
      eprOverlap: 'eprValue',
    },
    {
      id: 'baz',
      title: 'Baz',
      description: 'test integration',
      type: 'ui_link',
      uiInternalPath: '/path/to/baz',
      isBeta: false,
      icons: [],
      categories: ['cloud'],
      shipper: 'tests',
      eprOverlap: 'eprOtherValue',
    },
  ];

  describe('filterCustomIntegrations', () => {
    test('filters on shipper', () => {
      let result = filterCustomIntegrations(integrations, { shipper: 'other' });
      expect(result.length).toBe(2);
      result = filterCustomIntegrations(integrations, { shipper: 'tests' });
      expect(result.length).toBe(2);
      result = filterCustomIntegrations(integrations, { shipper: 'foobar' });
      expect(result.length).toBe(0);
    });
    test('filters on eprOverlap', () => {
      let result = filterCustomIntegrations(integrations, { eprOverlap: 'eprValue' });
      expect(result.length).toBe(2);
      result = filterCustomIntegrations(integrations, { eprOverlap: 'eprOtherValue' });
      expect(result.length).toBe(1);
      result = filterCustomIntegrations(integrations, { eprOverlap: 'otherValue' });
      expect(result.length).toBe(0);
    });
    test('filters on categories', () => {
      let result = filterCustomIntegrations(integrations, { categories: ['aws'] });
      expect(result.length).toBe(2);
      result = filterCustomIntegrations(integrations, { categories: ['cloud'] });
      expect(result.length).toBe(3);
      result = filterCustomIntegrations(integrations, { categories: ['aws', 'cloud'] });
      expect(result.length).toBe(1);
      result = filterCustomIntegrations(integrations, { categories: ['azure', 'cloud'] });
      expect(result.length).toBe(0);
      result = filterCustomIntegrations(integrations, { categories: ['aws', 'azure', 'cloud'] });
      expect(result.length).toBe(0);
      result = filterCustomIntegrations(integrations, { categories: ['azure'] });
      expect(result.length).toBe(0);
    });
    test('filters on categories and shipper', () => {
      let result = filterCustomIntegrations(integrations, {
        categories: ['aws'],
        shipper: 'other',
      });
      expect(result.length).toBe(1);
      result = filterCustomIntegrations(integrations, {
        categories: ['aws', 'cloud'],
        shipper: 'other',
      });
      expect(result.length).toBe(0);
      result = filterCustomIntegrations(integrations, {
        categories: ['aws', 'cloud'],
        shipper: 'tests',
      });
      expect(result.length).toBe(1);
      result = filterCustomIntegrations(integrations, {
        categories: ['azure', 'cloud'],
        shipper: 'tests',
      });
      expect(result.length).toBe(0);
      result = filterCustomIntegrations(integrations, {
        categories: ['azure', 'cloud'],
        shipper: 'other',
      });
      expect(result.length).toBe(0);
    });
    test('filters on categories and eprOverlap', () => {
      let result = filterCustomIntegrations(integrations, {
        categories: ['aws'],
        eprOverlap: 'eprValue',
      });
      expect(result.length).toBe(1);
      result = filterCustomIntegrations(integrations, {
        categories: ['aws', 'cloud'],
        eprOverlap: 'eprValue',
      });
      expect(result.length).toBe(0);
      result = filterCustomIntegrations(integrations, {
        categories: ['cloud'],
        eprOverlap: 'eprValue',
      });
      expect(result.length).toBe(1);
      result = filterCustomIntegrations(integrations, {
        categories: ['cloud'],
        eprOverlap: 'eprOtherValue',
      });
      expect(result.length).toBe(1);
    });
    test('filters on categories, shipper, eprOverlap', () => {
      const result = filterCustomIntegrations(integrations, {
        categories: ['aws'],
        shipper: 'other',
        eprOverlap: 'eprValue',
      });
      expect(result.length).toBe(1);
    });
  });
});
