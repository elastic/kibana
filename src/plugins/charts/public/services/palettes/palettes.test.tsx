/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PaletteDefinition } from '@kbn/coloring';
import { createColorPalette as createLegacyColorPalette } from '../..';
import { buildPalettes } from './palettes';
import { colorsServiceMock } from '../legacy_colors/mock';
import { euiPaletteColorBlind, euiPaletteColorBlindBehindText } from '@elastic/eui';

describe('palettes', () => {
  const palettes: Record<string, PaletteDefinition> = buildPalettes(colorsServiceMock);
  describe('default palette', () => {
    describe('syncColors: false', () => {
      it('should return different colors based on behind text flag', () => {
        const palette = palettes.default;

        const color1 = palette.getCategoricalColor([
          {
            name: 'abc',
            rankAtDepth: 0,
            totalSeriesAtDepth: 5,
          },
        ]);
        const color2 = palette.getCategoricalColor(
          [
            {
              name: 'abc',
              rankAtDepth: 0,
              totalSeriesAtDepth: 5,
            },
          ],
          {
            behindText: true,
          }
        );
        expect(color1).not.toEqual(color2);
      });

      it('should return different colors based on rank at current series', () => {
        const palette = palettes.default;

        const color1 = palette.getCategoricalColor([
          {
            name: 'abc',
            rankAtDepth: 0,
            totalSeriesAtDepth: 5,
          },
        ]);
        const color2 = palette.getCategoricalColor([
          {
            name: 'abc',
            rankAtDepth: 1,
            totalSeriesAtDepth: 5,
          },
        ]);
        expect(color1).not.toEqual(color2);
      });

      it('should return the same color for different positions on outer series layers', () => {
        const palette = palettes.default;

        const color1 = palette.getCategoricalColor([
          {
            name: 'abc',
            rankAtDepth: 0,
            totalSeriesAtDepth: 5,
          },
          {
            name: 'def',
            rankAtDepth: 0,
            totalSeriesAtDepth: 2,
          },
        ]);
        const color2 = palette.getCategoricalColor([
          {
            name: 'abc',
            rankAtDepth: 0,
            totalSeriesAtDepth: 5,
          },
          {
            name: 'ghj',
            rankAtDepth: 1,
            totalSeriesAtDepth: 1,
          },
        ]);
        expect(color1).toEqual(color2);
      });
    });

    describe('syncColors: true', () => {
      it('should return different colors based on behind text flag', () => {
        const palette = palettes.default;

        const color1 = palette.getCategoricalColor(
          [
            {
              name: 'abc',
              rankAtDepth: 0,
              totalSeriesAtDepth: 5,
            },
          ],
          {
            syncColors: true,
          }
        );
        const color2 = palette.getCategoricalColor(
          [
            {
              name: 'abc',
              rankAtDepth: 0,
              totalSeriesAtDepth: 5,
            },
          ],
          {
            behindText: true,
            syncColors: true,
          }
        );
        expect(color1).not.toEqual(color2);
      });

      it('should return different colors for different keys', () => {
        const palette = palettes.default;

        const color1 = palette.getCategoricalColor(
          [
            {
              name: 'abc',
              rankAtDepth: 0,
              totalSeriesAtDepth: 5,
            },
          ],
          {
            syncColors: true,
          }
        );
        const color2 = palette.getCategoricalColor(
          [
            {
              name: 'def',
              rankAtDepth: 0,
              totalSeriesAtDepth: 5,
            },
          ],
          {
            syncColors: true,
          }
        );
        expect(color1).not.toEqual(color2);
      });

      it('should return the same color for the same key, irregardless of rank', () => {
        const palette = palettes.default;

        const color1 = palette.getCategoricalColor(
          [
            {
              name: 'hij',
              rankAtDepth: 0,
              totalSeriesAtDepth: 5,
            },
          ],
          {
            syncColors: true,
          }
        );
        const color2 = palette.getCategoricalColor(
          [
            {
              name: 'hij',
              rankAtDepth: 5,
              totalSeriesAtDepth: 5,
            },
          ],
          {
            syncColors: true,
          }
        );
        expect(color1).toEqual(color2);
      });

      it('should return the same color for different positions on outer series layers', () => {
        const palette = palettes.default;

        const color1 = palette.getCategoricalColor(
          [
            {
              name: 'klm',
              rankAtDepth: 0,
              totalSeriesAtDepth: 5,
            },
            {
              name: 'def',
              rankAtDepth: 0,
              totalSeriesAtDepth: 2,
            },
          ],
          {
            syncColors: true,
          }
        );
        const color2 = palette.getCategoricalColor(
          [
            {
              name: 'klm',
              rankAtDepth: 3,
              totalSeriesAtDepth: 5,
            },
            {
              name: 'ghj',
              rankAtDepth: 1,
              totalSeriesAtDepth: 1,
            },
          ],
          {
            syncColors: true,
          }
        );
        expect(color1).toEqual(color2);
      });

      it('should return the same index of the behind text palette for same key', () => {
        const palette = palettes.default;

        const color1 = palette.getCategoricalColor(
          [
            {
              name: 'klm',
              rankAtDepth: 0,
              totalSeriesAtDepth: 5,
            },
            {
              name: 'def',
              rankAtDepth: 0,
              totalSeriesAtDepth: 2,
            },
          ],
          {
            syncColors: true,
          }
        );
        const color2 = palette.getCategoricalColor(
          [
            {
              name: 'klm',
              rankAtDepth: 3,
              totalSeriesAtDepth: 5,
            },
            {
              name: 'ghj',
              rankAtDepth: 1,
              totalSeriesAtDepth: 1,
            },
          ],
          {
            syncColors: true,
            behindText: true,
          }
        );
        const color1Index = euiPaletteColorBlind({ rotations: 2 }).indexOf(color1!);
        const color2Index = euiPaletteColorBlindBehindText({ rotations: 2 }).indexOf(color2!);
        expect(color1Index).toEqual(color2Index);
      });
    });
  });

  describe('gradient palette', () => {
    const palette = palettes.warm;

    it('should use the whole gradient', () => {
      const wholePalette = palette.getCategoricalColors(10);
      const color1 = palette.getCategoricalColor([
        {
          name: 'abc',
          rankAtDepth: 0,
          totalSeriesAtDepth: 10,
        },
      ]);
      const color2 = palette.getCategoricalColor([
        {
          name: 'def',
          rankAtDepth: 9,
          totalSeriesAtDepth: 10,
        },
      ]);
      expect(color1).toEqual(wholePalette[0]);
      expect(color2).toEqual(wholePalette[9]);
    });
  });

  describe('legacy palette', () => {
    const palette = palettes.kibana_palette;

    beforeEach(() => {
      (colorsServiceMock.mappedColors.mapKeys as jest.Mock).mockClear();
      (colorsServiceMock.mappedColors.getColorFromConfig as jest.Mock).mockReset();
      (colorsServiceMock.mappedColors.get as jest.Mock).mockClear();
    });

    describe('syncColors: false', () => {
      it('should not query legacy color service', () => {
        palette.getCategoricalColor(
          [
            {
              name: 'abc',
              rankAtDepth: 0,
              totalSeriesAtDepth: 10,
            },
          ],
          {
            syncColors: false,
          }
        );
        expect(colorsServiceMock.mappedColors.mapKeys).not.toHaveBeenCalled();
        expect(colorsServiceMock.mappedColors.get).not.toHaveBeenCalled();
      });

      it('should respect the advanced settings color mapping', () => {
        const configColorGetter = colorsServiceMock.mappedColors.getColorFromConfig as jest.Mock;
        configColorGetter.mockImplementation(() => 'blue');
        const result = palette.getCategoricalColor(
          [
            {
              name: 'abc',
              rankAtDepth: 2,
              totalSeriesAtDepth: 10,
            },
            {
              name: 'def',
              rankAtDepth: 0,
              totalSeriesAtDepth: 10,
            },
          ],
          {
            syncColors: false,
          }
        );
        expect(result).toEqual('blue');
        expect(configColorGetter).toHaveBeenCalledWith('abc');
      });

      it('should return a color from the legacy palette based on position of first series', () => {
        const result = palette.getCategoricalColor(
          [
            {
              name: 'abc',
              rankAtDepth: 2,
              totalSeriesAtDepth: 10,
            },
            {
              name: 'def',
              rankAtDepth: 0,
              totalSeriesAtDepth: 10,
            },
          ],
          {
            syncColors: false,
          }
        );
        expect(result).toEqual(createLegacyColorPalette(20)[2]);
      });
    });

    describe('syncColors: true', () => {
      it('should query legacy color service', () => {
        palette.getCategoricalColor(
          [
            {
              name: 'abc',
              rankAtDepth: 0,
              totalSeriesAtDepth: 10,
            },
          ],
          {
            syncColors: true,
          }
        );
        expect(colorsServiceMock.mappedColors.mapKeys).toHaveBeenCalledWith(['abc']);
        expect(colorsServiceMock.mappedColors.get).toHaveBeenCalledWith('abc');
      });

      it('should respect the advanced settings color mapping', () => {
        const configColorGetter = colorsServiceMock.mappedColors.getColorFromConfig as jest.Mock;
        configColorGetter.mockImplementation(() => 'blue');
        const result = palette.getCategoricalColor(
          [
            {
              name: 'abc',
              rankAtDepth: 2,
              totalSeriesAtDepth: 10,
            },
            {
              name: 'def',
              rankAtDepth: 0,
              totalSeriesAtDepth: 10,
            },
          ],
          {
            syncColors: false,
          }
        );
        expect(result).toEqual('blue');
        expect(configColorGetter).toHaveBeenCalledWith('abc');
      });

      it('should always use root series', () => {
        palette.getCategoricalColor(
          [
            {
              name: 'abc',
              rankAtDepth: 0,
              totalSeriesAtDepth: 10,
            },
            {
              name: 'def',
              rankAtDepth: 0,
              totalSeriesAtDepth: 10,
            },
          ],
          {
            syncColors: true,
          }
        );
        expect(colorsServiceMock.mappedColors.mapKeys).toHaveBeenCalledTimes(1);
        expect(colorsServiceMock.mappedColors.mapKeys).toHaveBeenCalledWith(['abc']);
        expect(colorsServiceMock.mappedColors.get).toHaveBeenCalledTimes(1);
        expect(colorsServiceMock.mappedColors.get).toHaveBeenCalledWith('abc');
      });
    });
  });

  describe('custom palette', () => {
    const palette = palettes.custom;
    it('should return different colors based on rank at current series', () => {
      const color1 = palette.getCategoricalColor(
        [
          {
            name: 'abc',
            rankAtDepth: 0,
            totalSeriesAtDepth: 5,
          },
        ],
        {},
        {
          colors: ['#00ff00', '#000000'],
        }
      );
      const color2 = palette.getCategoricalColor(
        [
          {
            name: 'abc',
            rankAtDepth: 1,
            totalSeriesAtDepth: 5,
          },
        ],
        {},
        {
          colors: ['#00ff00', '#000000'],
        }
      );
      expect(color1).not.toEqual(color2);
    });

    it('should return the same color for different positions on outer series layers', () => {
      const color1 = palette.getCategoricalColor(
        [
          {
            name: 'abc',
            rankAtDepth: 0,
            totalSeriesAtDepth: 5,
          },
          {
            name: 'def',
            rankAtDepth: 0,
            totalSeriesAtDepth: 2,
          },
        ],
        {},
        {
          colors: ['#00ff00', '#000000'],
        }
      );
      const color2 = palette.getCategoricalColor(
        [
          {
            name: 'abc',
            rankAtDepth: 0,
            totalSeriesAtDepth: 5,
          },
          {
            name: 'ghj',
            rankAtDepth: 1,
            totalSeriesAtDepth: 1,
          },
        ],
        {},
        {
          colors: ['#00ff00', '#000000'],
        }
      );
      expect(color1).toEqual(color2);
    });

    it('should use passed in colors', () => {
      const color = palette.getCategoricalColor(
        [
          {
            name: 'abc',
            rankAtDepth: 0,
            totalSeriesAtDepth: 10,
          },
        ],
        {},
        {
          colors: ['#00ff00', '#000000'],
          gradient: true,
        }
      );
      expect(color).toEqual('#00ff00');
    });

    // just an integration test here. More in depth tests on the subject can be found on the helper file
    it('should return a color for the given value with its domain', () => {
      expect(
        palette.getColorForValue!(
          0,
          { colors: ['red', 'green', 'blue'], stops: [], gradient: false },
          { min: 0, max: 100 }
        )
      ).toBe('red');
    });

    it('should return a color for the given value with its domain based on custom stops', () => {
      expect(
        palette.getColorForValue!(
          60,
          {
            colors: ['red', 'green', 'blue'],
            stops: [10, 50, 100],
            range: 'percent',
            gradient: false,
            rangeMin: 0,
            rangeMax: 100,
          },
          { min: 0, max: 100 }
        )
      ).toBe('blue');
    });

    // just make sure to not have broken anything
    it('should work with only legacy arguments, filling with default values the new ones', () => {
      expect(palette.toExpression({ colors: [], gradient: false })).toEqual({
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'palette',
            arguments: {
              color: [],
              gradient: [false],
              reverse: [false],
              continuity: ['above'],
              stop: [],
              range: ['percent'],
              rangeMax: [],
              rangeMin: [],
            },
          },
        ],
      });
    });
  });
});
