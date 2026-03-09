/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSpaceNPRE } from './get_space_npre';

const mockRequest = (pathname: string) => ({ url: new URL(`http://localhost:5601${pathname}`) });

describe('getSpaceNPRE', () => {
  describe('when called with a spaceId string', () => {
    it('returns the NPRE for the given space', () => {
      expect(getSpaceNPRE('my-space')).toBe('kibana_space_my-space_default');
    });

    it('uses "default" when spaceId is an empty string', () => {
      expect(getSpaceNPRE('')).toBe('kibana_space_default_default');
    });

    it('returns the NPRE for the default space when spaceId is "default"', () => {
      expect(getSpaceNPRE('default')).toBe('kibana_space_default_default');
    });
  });

  describe('when called with a request object', () => {
    it('extracts the space from the request URL and returns the NPRE', () => {
      expect(getSpaceNPRE(mockRequest('/s/my-space/api/foo'))).toBe(
        'kibana_space_my-space_default'
      );
    });

    it('returns the default space NPRE when the request URL has no space segment', () => {
      expect(getSpaceNPRE(mockRequest('/api/foo'))).toBe('kibana_space_default_default');
    });

    it('throws when the request has no url (e.g. a FakeRequest passed at runtime)', () => {
      const badRequest = { headers: {} } as unknown as { url: URL };
      expect(() => getSpaceNPRE(badRequest)).toThrow(
        `Cannot determine space NPRE: the Request object is missing a 'url' property.`
      );
    });
  });
});
