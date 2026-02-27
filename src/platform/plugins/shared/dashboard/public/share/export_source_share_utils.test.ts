/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildExportSourceFilename } from './export_source_share_utils';

describe('export_source_share_utils', () => {
  describe('buildExportSourceFilename', () => {
    it('adds the extension and preserves basic names', () => {
      expect(buildExportSourceFilename('my dashboard', '.json')).toBe('my dashboard.json');
    });

    it('defaults to export when filename base is empty', () => {
      expect(buildExportSourceFilename('   ', '.json')).toBe('export.json');
    });

    it('replaces invalid filename characters', () => {
      expect(buildExportSourceFilename('a/b:c*?"<>|d', '.json')).toBe('a_b_c______d.json');
    });

    it('collapses whitespace', () => {
      expect(buildExportSourceFilename('  a   b \n c\t', '.json')).toBe('a b c.json');
    });

    it('normalizes extension without leading dot', () => {
      expect(buildExportSourceFilename('name', 'json')).toBe('name.json');
    });
  });
});
