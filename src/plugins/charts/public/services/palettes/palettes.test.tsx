/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { coreMock } from '../../../../../core/public/mocks';
import { createColorPalette as createLegacyColorPalette } from '../../../../../../src/plugins/charts/public';
import { PaletteDefinition } from './types';
import { buildPalettes } from './palettes';
import { colorsServiceMock } from '../legacy_colors/mock';
import { euiPaletteColorBlind, euiPaletteColorBlindBehindText } from '@elastic/eui';

describe('palettes', () => {
  const palettes: Record<string, PaletteDefinition> = buildPalettes(
    coreMock.createStart().uiSettings,
    colorsServiceMock
  );
  describe('default palette', () => {
    describe('syncColors: false', () => {
      it('should return different colors based on behind text flag', () => {
        const palette = palettes.default;

        const color1 = palette.getColor([
          {
            name: 'abc',
            rankAtDepth: 0,
            totalSeriesAtDepth: 5,
          },
        ]);
        const color2 = palette.getColor(
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

        const color1 = palette.getColor([
          {
            name: 'abc',
            rankAtDepth: 0,
            totalSeriesAtDepth: 5,
          },
        ]);
        const color2 = palette.getColor([
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

        const color1 = palette.getColor([
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
        const color2 = palette.getColor([
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

        const color1 = palette.getColor(
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
        const color2 = palette.getColor(
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

        const color1 = palette.getColor(
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
        const color2 = palette.getColor(
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

        const color1 = palette.getColor(
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
        const color2 = palette.getColor(
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

        const color1 = palette.getColor(
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
        const color2 = palette.getColor(
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

        const color1 = palette.getColor(
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
        const color2 = palette.getColor(
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
      const wholePalette = palette.getColors(10);
      const color1 = palette.getColor([
        {
          name: 'abc',
          rankAtDepth: 0,
          totalSeriesAtDepth: 10,
        },
      ]);
      const color2 = palette.getColor([
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
      (colorsServiceMock.mappedColors.get as jest.Mock).mockClear();
    });

    describe('syncColors: false', () => {
      it('should not query legacy color service', () => {
        palette.getColor(
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

      it('should return a color from the legacy palette based on position of first series', () => {
        const result = palette.getColor(
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
        palette.getColor(
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

      it('should always use root series', () => {
        palette.getColor(
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
      const color1 = palette.getColor(
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
      const color2 = palette.getColor(
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
      const color1 = palette.getColor(
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
      const color2 = palette.getColor(
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
      const color = palette.getColor(
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
  });
});
