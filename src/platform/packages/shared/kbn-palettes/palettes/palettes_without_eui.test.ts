/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

describe('palettes without @elastic/eui', () => {
  it.each([
    ['light', false],
    ['dark', true],
  ])('returns valid colors for every %s palette in a fresh module context', async (_, darkMode) => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@elastic/eui', () => {
        throw new Error('@elastic/eui must not be loaded by @kbn/palettes');
      });

      const { getPalettes } = await import('..');
      const palettes = getPalettes(darkMode).getAll();

      expect(palettes.length).toBeGreaterThan(0);
      for (const palette of palettes) {
        const colors = palette.colors(3);
        expect(colors).toHaveLength(3);
        for (const color of colors) {
          expect(color).toMatch(HEX_COLOR);
        }
      }
    });
  });
});
