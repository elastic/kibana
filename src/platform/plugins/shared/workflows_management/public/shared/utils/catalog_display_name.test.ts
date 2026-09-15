/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  prettifyCatalogKey,
  prettifyStepTypeDisplayName,
  resolveCatalogDisplayName,
} from './catalog_display_name';

describe('catalog_display_name', () => {
  describe('prettifyCatalogKey', () => {
    it('sentence-cases camelCase, kebab, and snake keys', () => {
      expect(prettifyCatalogKey('failOnError')).toBe('Fail on error');
      expect(prettifyCatalogKey('connector-id')).toBe('Connector id');
      expect(prettifyCatalogKey('createCaseDefaultSpace')).toBe('Create case default space');
    });
  });

  describe('prettifyStepTypeDisplayName', () => {
    it('prettifies the last dotted segment', () => {
      expect(prettifyStepTypeDisplayName('kibana.createCaseDefaultSpace')).toBe(
        'Create case default space'
      );
      expect(prettifyStepTypeDisplayName('http.post')).toBe('Post');
    });
  });

  describe('resolveCatalogDisplayName', () => {
    it('prefers explicit catalog labels over the type string', () => {
      expect(
        resolveCatalogDisplayName({
          type: 'slack',
          summary: 'Slack',
        })
      ).toBe('Slack');
      expect(
        resolveCatalogDisplayName({
          type: 'kibana.request',
          actionLabel: 'Kibana Request',
        })
      ).toBe('Kibana Request');
    });

    it('falls back to a prettified type segment when metadata is missing', () => {
      expect(
        resolveCatalogDisplayName({
          type: 'kibana.createCaseDefaultSpace',
          summary: null,
          displayName: null,
          description: null,
        })
      ).toBe('Create case default space');
    });

    it('ignores candidates that are just the raw type', () => {
      expect(
        resolveCatalogDisplayName({
          type: 'kibana.createCaseDefaultSpace',
          summary: 'kibana.createCaseDefaultSpace',
          description: 'kibana.createCaseDefaultSpace',
        })
      ).toBe('Create case default space');
    });

    it('uses the head of "Name - details" descriptions', () => {
      expect(
        resolveCatalogDisplayName({
          type: 'cases.create',
          description: 'Create Case - Opens a new case',
        })
      ).toBe('Create Case');
    });
  });
});
