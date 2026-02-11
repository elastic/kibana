/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  shouldIncludeScript,
  getBundlePath,
  extractSourceMapUrl,
  generateCoverageHash,
  generateTestFileCoverageHash,
} from './browser_coverage_collector';

describe('browser_coverage_collector', () => {
  describe('shouldIncludeScript', () => {
    it('returns false for empty URLs', () => {
      expect(shouldIncludeScript('')).toBe(false);
    });

    it('returns false for undefined/null-like values', () => {
      // @ts-expect-error testing invalid input
      expect(shouldIncludeScript(undefined)).toBe(false);
      // @ts-expect-error testing invalid input
      expect(shouldIncludeScript(null)).toBe(false);
    });

    it('excludes npm shared deps bundles', () => {
      expect(
        shouldIncludeScript(
          'http://localhost:5620/XXX/bundles/kbn-ui-shared-deps-npm/kbn-ui-shared-deps-npm.dll.js'
        )
      ).toBe(false);
      expect(
        shouldIncludeScript(
          'http://localhost:5620/XXX/bundles/kbn-ui-shared-deps-npm/kbn-ui-shared-deps-npm.chunk.125.js'
        )
      ).toBe(false);
    });

    it('excludes data URLs', () => {
      expect(shouldIncludeScript('data:text/javascript,console.log("test")')).toBe(false);
    });

    it('excludes non-bundle URLs', () => {
      expect(shouldIncludeScript('http://localhost:5620/bootstrap.js')).toBe(false);
      expect(shouldIncludeScript('http://localhost:5620/s/default/app/home')).toBe(false);
    });

    it('includes Kibana plugin bundles', () => {
      expect(
        shouldIncludeScript(
          'http://localhost:5620/XXX/bundles/plugin/banners/1.0.0/banners.plugin.js'
        )
      ).toBe(true);
      expect(
        shouldIncludeScript(
          'http://localhost:5620/XXX/bundles/plugin/security/1.0.0/security.plugin.js'
        )
      ).toBe(true);
    });

    it('includes core bundles', () => {
      expect(shouldIncludeScript('http://localhost:5620/XXX/bundles/core/core.entry.js')).toBe(
        true
      );
    });

    it('includes kbn-ui-shared-deps-src bundles', () => {
      expect(
        shouldIncludeScript(
          'http://localhost:5620/XXX/bundles/kbn-ui-shared-deps-src/kbn-ui-shared-deps-src.js'
        )
      ).toBe(true);
    });
  });

  describe('getBundlePath', () => {
    it('extracts bundle path from full URL', () => {
      expect(
        getBundlePath('http://localhost:5620/XXX/bundles/plugin/banners/1.0.0/banners.plugin.js')
      ).toBe('bundles/plugin/banners/1.0.0/banners.plugin.js');
    });

    it('extracts core bundle path', () => {
      expect(getBundlePath('http://localhost:5620/XXX/bundles/core/core.entry.js')).toBe(
        'bundles/core/core.entry.js'
      );
    });

    it('handles URLs with spaces paths', () => {
      expect(
        getBundlePath('http://localhost:5620/s/my-space/XXX/bundles/plugin/foo/foo.plugin.js')
      ).toBe('bundles/plugin/foo/foo.plugin.js');
    });

    it('returns pathname for non-bundle URLs', () => {
      expect(getBundlePath('http://localhost:5620/bootstrap.js')).toBe('/bootstrap.js');
    });

    it('returns original string for invalid URLs', () => {
      expect(getBundlePath('not-a-url')).toBe('not-a-url');
    });
  });

  describe('extractSourceMapUrl', () => {
    const scriptUrl = 'http://localhost:5620/XXX/bundles/plugin/foo/foo.plugin.js';

    it('extracts relative source map URL and resolves it', () => {
      const source = 'console.log("test");\n//# sourceMappingURL=foo.plugin.js.map';
      expect(extractSourceMapUrl(source, scriptUrl)).toBe(
        'http://localhost:5620/XXX/bundles/plugin/foo/foo.plugin.js.map'
      );
    });

    it('returns absolute source map URLs as-is', () => {
      const source =
        'console.log("test");\n//# sourceMappingURL=http://cdn.example.com/maps/foo.js.map';
      expect(extractSourceMapUrl(source, scriptUrl)).toBe('http://cdn.example.com/maps/foo.js.map');
    });

    it('handles @ symbol in sourceMappingURL comment', () => {
      const source = 'console.log("test");\n//@ sourceMappingURL=foo.plugin.js.map';
      expect(extractSourceMapUrl(source, scriptUrl)).toBe(
        'http://localhost:5620/XXX/bundles/plugin/foo/foo.plugin.js.map'
      );
    });

    it('returns null when no source map URL is present', () => {
      const source = 'console.log("test");';
      expect(extractSourceMapUrl(source, scriptUrl)).toBeNull();
    });

    it('handles source map URL at end of file without newline', () => {
      const source = 'console.log("test");//# sourceMappingURL=foo.plugin.js.map';
      expect(extractSourceMapUrl(source, scriptUrl)).toBe(
        'http://localhost:5620/XXX/bundles/plugin/foo/foo.plugin.js.map'
      );
    });

    it('handles source map URL with content after it', () => {
      const source =
        'console.log("test");\n//# sourceMappingURL=foo.plugin.js.map\n// some other comment';
      expect(extractSourceMapUrl(source, scriptUrl)).toBe(
        'http://localhost:5620/XXX/bundles/plugin/foo/foo.plugin.js.map'
      );
    });

    it('returns raw reference when script URL is invalid', () => {
      const source = 'console.log("test");\n//# sourceMappingURL=foo.plugin.js.map';
      expect(extractSourceMapUrl(source, 'invalid-url')).toBe('foo.plugin.js.map');
    });
  });

  describe('generateCoverageHash', () => {
    it('generates a 16-character hash', () => {
      const hash = generateCoverageHash('src/test/file.ts', 'my test title');
      expect(hash).toHaveLength(16);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('generates deterministic hashes', () => {
      const hash1 = generateCoverageHash('src/test/file.ts', 'my test title');
      const hash2 = generateCoverageHash('src/test/file.ts', 'my test title');
      expect(hash1).toBe(hash2);
    });

    it('generates different hashes for different test files', () => {
      const hash1 = generateCoverageHash('src/test/file1.ts', 'my test title');
      const hash2 = generateCoverageHash('src/test/file2.ts', 'my test title');
      expect(hash1).not.toBe(hash2);
    });

    it('generates different hashes for different test titles', () => {
      const hash1 = generateCoverageHash('src/test/file.ts', 'test title 1');
      const hash2 = generateCoverageHash('src/test/file.ts', 'test title 2');
      expect(hash1).not.toBe(hash2);
    });

    it('generates different hashes when label is provided', () => {
      const hash1 = generateCoverageHash('src/test/file.ts', 'my test title');
      const hash2 = generateCoverageHash('src/test/file.ts', 'my test title', 'my-label');
      expect(hash1).not.toBe(hash2);
    });

    it('generates deterministic hashes with label', () => {
      const hash1 = generateCoverageHash('src/test/file.ts', 'my test title', 'my-label');
      const hash2 = generateCoverageHash('src/test/file.ts', 'my test title', 'my-label');
      expect(hash1).toBe(hash2);
    });

    it('generates different hashes for different labels', () => {
      const hash1 = generateCoverageHash('src/test/file.ts', 'my test title', 'label-1');
      const hash2 = generateCoverageHash('src/test/file.ts', 'my test title', 'label-2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateTestFileCoverageHash', () => {
    it('generates a 16-character hash', () => {
      const hash = generateTestFileCoverageHash('src/test/file.ts');
      expect(hash).toHaveLength(16);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('generates deterministic hashes', () => {
      const hash1 = generateTestFileCoverageHash('src/test/file.ts');
      const hash2 = generateTestFileCoverageHash('src/test/file.ts');
      expect(hash1).toBe(hash2);
    });

    it('generates different hashes for different test files', () => {
      const hash1 = generateTestFileCoverageHash('src/test/file1.ts');
      const hash2 = generateTestFileCoverageHash('src/test/file2.ts');
      expect(hash1).not.toBe(hash2);
    });
  });
});
