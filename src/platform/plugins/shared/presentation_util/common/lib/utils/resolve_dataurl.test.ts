/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { missingImage } from './missing_asset';
import { resolveFromArgs, resolveWithMissingImage } from './resolve_dataurl';

describe('resolve_dataurl', () => {
  describe('resolveFromArgs', () => {
    it('finds and returns the dataurl from args successfully', () => {
      const args = {
        name: 'dataurl',
        argType: 'imageUpload',
        dataurl: [missingImage, 'test2'],
      };
      expect(resolveFromArgs(args)).toBe(missingImage);
    });
    it('finds and returns null for invalid dataurl', () => {
      const args = {
        name: 'dataurl',
        argType: 'imageUpload',
        dataurl: ['invalid url', 'test2'],
      };
      expect(resolveFromArgs(args)).toBe(null);
    });
  });

  describe('resolveWithMissingImage', () => {
    it('returns valid dataurl', () => {
      expect(resolveWithMissingImage(missingImage)).toBe(missingImage);
    });
    it('returns missingImage for invalid dataurl', () => {
      expect(resolveWithMissingImage('invalid dataurl')).toBe(missingImage);
    });
    it('returns null for null dataurl', () => {
      expect(resolveWithMissingImage(null)).toBe(null);
    });
  });
});
