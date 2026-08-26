/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

describe('theme_loader', () => {
  const loaderPath = Path.resolve(__dirname, 'theme_loader.ts');

  it('should exist', () => {
    expect(Fs.existsSync(loaderPath)).toBe(true);
  });

  describe('loader source code', () => {
    let loaderSource: string;

    beforeAll(() => {
      loaderSource = Fs.readFileSync(loaderPath, 'utf-8');
    });

    it('should export a default function (webpack loader convention)', () => {
      expect(loaderSource).toContain('export default');
    });

    it('should be a function named themeLoader', () => {
      expect(loaderSource).toContain('function themeLoader');
    });

    it('should reference window.__kbnThemeTag__', () => {
      expect(loaderSource).toContain('__kbnThemeTag__');
    });

    it('should generate switch statement for theme selection', () => {
      expect(loaderSource).toContain('switch');
    });

    it('should use themeTags from options', () => {
      expect(loaderSource).toContain('themeTags');
    });

    it('should handle fallback theme', () => {
      expect(loaderSource).toContain('FALLBACK_THEME_TAG');
    });

    it('should use resourceQuery for theme-specific imports', () => {
      expect(loaderSource).toContain('resourceQuery');
    });
  });

  describe('theme globals files exist', () => {
    // The actual path is src/core/public/styles/core_app/
    const themeGlobalsDir = Path.resolve(REPO_ROOT, 'src/core/public/styles/core_app');

    it('light theme globals should exist', () => {
      const lightGlobals = Path.resolve(themeGlobalsDir, '_globals_borealislight.scss');
      expect(Fs.existsSync(lightGlobals)).toBe(true);
    });

    it('dark theme globals should exist', () => {
      const darkGlobals = Path.resolve(themeGlobalsDir, '_globals_borealisdark.scss');
      expect(Fs.existsSync(darkGlobals)).toBe(true);
    });
  });
});
