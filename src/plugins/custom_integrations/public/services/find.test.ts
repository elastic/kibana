/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
      let result = filterCustomIntegrations(integrations, { eprPackageName: 'eprValue' });
      expect(result.length).toBe(2);
      result = filterCustomIntegrations(integrations, { eprPackageName: 'eprOtherValue' });
      expect(result.length).toBe(1);
      result = filterCustomIntegrations(integrations, { eprPackageName: 'otherValue' });
      expect(result.length).toBe(0);
    });
    test('filters on categories and shipper, eprOverlap', () => {
      const result = filterCustomIntegrations(integrations, {
        shipper: 'other',
        eprPackageName: 'eprValue',
      });
      expect(result.length).toBe(2);
    });
  });
});
