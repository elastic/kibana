/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSavedSearchUrl, getSavedSearchFullPathUrl } from './saved_searches_url';

describe('saved_searches_url', () => {
  describe('getSavedSearchUrl', () => {
    test('should return valid saved search url', () => {
      expect(getSavedSearchUrl()).toBe('#/');
      expect(getSavedSearchUrl('id')).toBe('#/view/id');
    });
  });

  describe('getSavedSearchFullPathUrl', () => {
    test('should return valid full path url', () => {
      expect(getSavedSearchFullPathUrl()).toBe('/app/discover#/');
      expect(getSavedSearchFullPathUrl('id')).toBe('/app/discover#/view/id');
    });
  });
});
