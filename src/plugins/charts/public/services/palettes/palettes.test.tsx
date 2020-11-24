/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { coreMock } from '../../../../../core/public/mocks';
import { PaletteDefinition } from './types';
import { buildPalettes } from './palettes';
import { colorsServiceMock } from '../legacy_colors/mock';

describe('palettes', () => {
  const palettes: Record<string, PaletteDefinition> = buildPalettes(
    coreMock.createStart().uiSettings,
    colorsServiceMock
  );
  describe('default palette', () => {
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

    it('should query legacy color service', () => {
      palette.getColor([
        {
          name: 'abc',
          rankAtDepth: 0,
          totalSeriesAtDepth: 10,
        },
      ]);
      expect(colorsServiceMock.mappedColors.mapKeys).toHaveBeenCalledWith(['abc']);
      expect(colorsServiceMock.mappedColors.get).toHaveBeenCalledWith('abc');
    });

    it('should always use root series', () => {
      palette.getColor([
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
      ]);
      expect(colorsServiceMock.mappedColors.mapKeys).toHaveBeenCalledTimes(1);
      expect(colorsServiceMock.mappedColors.mapKeys).toHaveBeenCalledWith(['abc']);
      expect(colorsServiceMock.mappedColors.get).toHaveBeenCalledTimes(1);
      expect(colorsServiceMock.mappedColors.get).toHaveBeenCalledWith('abc');
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
