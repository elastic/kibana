/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScopeableUrlRequest } from '@kbn/core-elasticsearch-server';
import { getSpaceNPRE } from './get_space_npre';

const mockRequest = (pathname: string) => ({
  headers: {},
  url: new URL(`http://localhost:5601${pathname}`),
});

describe('getSpaceNPRE', () => {
  describe('when called with a spaceId string', () => {
    it('returns the NPRE reference for the given space', () => {
      expect(getSpaceNPRE('my-space')).toBe('@kibana_space_my-space_default');
    });

    it('uses "default" when spaceId is an empty string', () => {
      expect(getSpaceNPRE('')).toBe('@kibana_space_default_default');
    });

    it('returns the NPRE reference for the default space when spaceId is "default"', () => {
      expect(getSpaceNPRE('default')).toBe('@kibana_space_default_default');
    });
  });

  describe('when called with a request object', () => {
    it('extracts the space from the request URL and returns the NPRE reference', () => {
      expect(getSpaceNPRE(mockRequest('/s/my-space/api/foo'))).toBe(
        '@kibana_space_my-space_default'
      );
    });

    it('returns the default space NPRE reference when the request URL has no space segment', () => {
      expect(getSpaceNPRE(mockRequest('/api/foo'))).toBe('@kibana_space_default_default');
    });

    it('uses rewrittenUrl when present so space is resolved after Spaces strips /s/:id from url', () => {
      const request = {
        headers: {},
        url: new URL('http://localhost:5601/api/foo'),
        rewrittenUrl: new URL('http://localhost:5601/s/my-space/api/foo'),
      };
      expect(getSpaceNPRE(request)).toBe('@kibana_space_my-space_default');
    });

    it('prefers rewrittenUrl over url when both carry a space segment (first rewrite snapshot wins)', () => {
      const request = {
        headers: {},
        url: new URL('http://localhost:5601/s/other-space/api/foo'),
        rewrittenUrl: new URL('http://localhost:5601/s/my-space/api/foo'),
      };
      expect(getSpaceNPRE(request)).toBe('@kibana_space_my-space_default');
    });

    it('ignores rewrittenUrl when it is undefined and uses url pathname', () => {
      const request = {
        headers: {},
        url: new URL('http://localhost:5601/s/my-space/api/foo'),
        rewrittenUrl: undefined as URL | undefined,
      };
      expect(getSpaceNPRE(request)).toBe('@kibana_space_my-space_default');
    });

    it('throws when the request has no url (e.g. a FakeRequest passed at runtime)', () => {
      const badRequest = { headers: {} } as unknown as ScopeableUrlRequest;
      expect(() => getSpaceNPRE(badRequest)).toThrow(
        `Cannot determine space NPRE: the Request object is missing a 'url' property.`
      );
    });
  });
});
