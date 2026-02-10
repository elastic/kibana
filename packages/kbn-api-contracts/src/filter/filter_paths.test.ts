/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { shouldIncludePath, filterSpecPaths, type PathFilterOptions } from './filter_paths';
import type { NormalizedSpec } from '../input/normalize_oas';

describe('filter_paths', () => {
  describe('shouldIncludePath', () => {
    it('returns true when no filters specified', () => {
      expect(shouldIncludePath('/api/foo', {})).toBe(true);
    });

    describe('include patterns', () => {
      it('matches exact path', () => {
        const options: PathFilterOptions = { include: ['/api/foo'] };
        expect(shouldIncludePath('/api/foo', options)).toBe(true);
        expect(shouldIncludePath('/api/bar', options)).toBe(false);
      });

      it('matches single wildcard', () => {
        const options: PathFilterOptions = { include: ['/api/*'] };
        expect(shouldIncludePath('/api/foo', options)).toBe(true);
        expect(shouldIncludePath('/api/bar', options)).toBe(true);
        expect(shouldIncludePath('/api/foo/bar', options)).toBe(false);
      });

      it('matches double wildcard (glob)', () => {
        const options: PathFilterOptions = { include: ['/api/fleet/**'] };
        expect(shouldIncludePath('/api/fleet/agents', options)).toBe(true);
        expect(shouldIncludePath('/api/fleet/agents/bulk', options)).toBe(true);
        expect(shouldIncludePath('/api/alerting/rules', options)).toBe(false);
      });

      it('matches multiple include patterns', () => {
        const options: PathFilterOptions = { include: ['/api/fleet/**', '/api/alerting/**'] };
        expect(shouldIncludePath('/api/fleet/agents', options)).toBe(true);
        expect(shouldIncludePath('/api/alerting/rules', options)).toBe(true);
        expect(shouldIncludePath('/api/spaces', options)).toBe(false);
      });
    });

    describe('exclude patterns', () => {
      it('excludes exact path', () => {
        const options: PathFilterOptions = { exclude: ['/api/internal'] };
        expect(shouldIncludePath('/api/foo', options)).toBe(true);
        expect(shouldIncludePath('/api/internal', options)).toBe(false);
      });

      it('excludes with wildcard', () => {
        const options: PathFilterOptions = { exclude: ['/api/internal/**'] };
        expect(shouldIncludePath('/api/foo', options)).toBe(true);
        expect(shouldIncludePath('/api/internal/status', options)).toBe(false);
        expect(shouldIncludePath('/api/internal/deep/nested', options)).toBe(false);
      });
    });

    describe('include + exclude combined', () => {
      it('include takes precedence then exclude filters', () => {
        const options: PathFilterOptions = {
          include: ['/api/**'],
          exclude: ['/api/internal/**'],
        };
        expect(shouldIncludePath('/api/fleet/agents', options)).toBe(true);
        expect(shouldIncludePath('/api/internal/status', options)).toBe(false);
        expect(shouldIncludePath('/s/foo/api/bar', options)).toBe(false);
      });
    });
  });

  describe('filterSpecPaths', () => {
    const createSpec = (paths: string[]): NormalizedSpec => ({
      paths: Object.fromEntries(paths.map((path) => [path, { get: {} }])),
    });

    it('returns spec unchanged when no filters', () => {
      const spec = createSpec(['/api/foo', '/api/bar']);
      const result = filterSpecPaths(spec, {});
      expect(Object.keys(result.paths)).toEqual(['/api/foo', '/api/bar']);
    });

    it('filters with include pattern', () => {
      const spec = createSpec(['/api/fleet/agents', '/api/alerting/rules', '/api/spaces']);
      const result = filterSpecPaths(spec, { include: ['/api/fleet/**'] });
      expect(Object.keys(result.paths)).toEqual(['/api/fleet/agents']);
    });

    it('filters with exclude pattern', () => {
      const spec = createSpec(['/api/fleet/agents', '/api/internal/status', '/api/spaces']);
      const result = filterSpecPaths(spec, { exclude: ['/api/internal/**'] });
      expect(Object.keys(result.paths)).toEqual(['/api/fleet/agents', '/api/spaces']);
    });

    it('applies both include and exclude', () => {
      const spec = createSpec([
        '/api/fleet/agents',
        '/api/fleet/internal/debug',
        '/api/alerting/rules',
      ]);
      const result = filterSpecPaths(spec, {
        include: ['/api/fleet/**'],
        exclude: ['**/internal/**'],
      });
      expect(Object.keys(result.paths)).toEqual(['/api/fleet/agents']);
    });
  });
});
