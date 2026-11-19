/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BreakingChange } from '../diff';
import type { OpenAPISpec } from '../input/load_oas';
import { resolveTier } from './resolve_tier';

const spec = (paths: Record<string, unknown>): OpenAPISpec => ({
  openapi: '3.0.0',
  info: { title: 't', version: '1' },
  paths,
});

const change = (over: Partial<BreakingChange>): BreakingChange => ({
  type: 'method_removed',
  path: '/api/x',
  reason: 'r',
  ...over,
});

describe('resolveTier', () => {
  describe('operation-level (change has a method)', () => {
    const tierForXState = (xState?: string): string => {
      const base = spec({ '/api/x': { post: xState === undefined ? {} : { 'x-state': xState } } });
      return resolveTier(base, change({ method: 'POST' })).tier;
    };

    it('treats a missing x-state as stable', () => {
      expect(tierForXState(undefined)).toBe('stable');
    });

    it('treats "Generally available" as stable', () => {
      expect(tierForXState('Generally available')).toBe('stable');
    });

    it('treats a bare "Added in <version>" string as stable', () => {
      expect(tierForXState('Added in 9.4.0')).toBe('stable');
    });

    it('treats "Technical Preview" as tech_preview', () => {
      expect(tierForXState('Technical Preview')).toBe('tech_preview');
    });

    it('treats "Experimental" as experimental', () => {
      expect(tierForXState('Experimental')).toBe('experimental');
    });

    it('treats "Technical Preview; added in <version>" as tech_preview', () => {
      expect(tierForXState('Technical Preview; added in 9.2.0')).toBe('tech_preview');
    });

    it('normalizes the method case (POST -> post)', () => {
      const base = spec({ '/api/x': { post: { 'x-state': 'Experimental' } } });
      expect(resolveTier(base, change({ method: 'POST' })).tier).toBe('experimental');
    });

    it('carries the since value from the operation', () => {
      const base = spec({ '/api/x': { post: { 'x-state': 'Technical Preview; added in 9.2.0' } } });
      expect(resolveTier(base, change({ method: 'POST' }))).toEqual({
        tier: 'tech_preview',
        since: '9.2.0',
      });
    });

    it('falls back to stable when the method is absent on the path', () => {
      const base = spec({ '/api/x': { get: { 'x-state': 'Experimental' } } });
      expect(resolveTier(base, change({ method: 'POST' })).tier).toBe('stable');
    });
  });

  describe('path-level (path_removed, no method) uses most-conservative-wins', () => {
    const tierForPath = (pathItem: Record<string, unknown>): string =>
      resolveTier(spec({ '/api/x': pathItem }), change({ type: 'path_removed', method: undefined }))
        .tier;

    it('takes stable when a path mixes tiers', () => {
      expect(
        tierForPath({
          get: { 'x-state': 'Generally available' },
          post: { 'x-state': 'Technical Preview' },
          delete: { 'x-state': 'Experimental' },
        })
      ).toBe('stable');
    });

    it('takes tech_preview when every operation is tech_preview', () => {
      expect(
        tierForPath({
          get: { 'x-state': 'Technical Preview' },
          post: { 'x-state': 'Technical Preview' },
        })
      ).toBe('tech_preview');
    });

    it('takes experimental when every operation is experimental', () => {
      expect(
        tierForPath({
          get: { 'x-state': 'Experimental' },
          delete: { 'x-state': 'Experimental' },
        })
      ).toBe('experimental');
    });

    it('takes tech_preview over experimental', () => {
      expect(
        tierForPath({
          get: { 'x-state': 'Experimental' },
          post: { 'x-state': 'Technical Preview' },
        })
      ).toBe('tech_preview');
    });

    it('carries the since of the most-conservative operation on the path', () => {
      const base = spec({
        '/api/x': {
          get: { 'x-state': 'Technical Preview; added in 9.2.0' },
          post: { 'x-state': 'Generally available; added in 9.1.0' },
        },
      });
      expect(resolveTier(base, change({ type: 'path_removed', method: undefined }))).toEqual({
        tier: 'stable',
        since: '9.1.0',
      });
    });

    it('ignores non-operation keys (parameters, summary, $ref, x-*)', () => {
      const base = spec({
        '/api/x': {
          parameters: [{ name: 'id' }],
          summary: 'a path',
          $ref: '#/somewhere',
          'x-foo': 'bar',
          post: { 'x-state': 'Experimental' },
        },
      });
      expect(resolveTier(base, change({ type: 'path_removed', method: undefined })).tier).toBe(
        'experimental'
      );
    });

    it('falls back to stable when the path has no operations', () => {
      const base = spec({ '/api/x': { summary: 'no operations here' } });
      expect(resolveTier(base, change({ type: 'path_removed', method: undefined })).tier).toBe(
        'stable'
      );
    });
  });

  describe('conservative default', () => {
    it('returns stable when the path is absent from the base spec', () => {
      const base = spec({ '/api/other': { get: { 'x-state': 'Experimental' } } });
      expect(resolveTier(base, change({ path: '/api/x', method: 'GET' })).tier).toBe('stable');
    });

    it('returns stable when the base spec has no paths', () => {
      const base = spec({});
      expect(resolveTier(base, change({ method: 'GET' })).tier).toBe('stable');
    });
  });
});
