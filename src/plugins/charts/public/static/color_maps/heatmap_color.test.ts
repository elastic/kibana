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

import { getHeatmapColors } from './heatmap_color';

describe('Vislib Heatmap Color Module Test Suite', () => {
  const emptyObject = {};
  const nullValue = null;

  it('should throw an error if schema is invalid', () => {
    expect(() => {
      getHeatmapColors(4, 'invalid schema');
    }).toThrowError();
  });

  it('should throw an error if input is not a number', () => {
    expect(() => {
      getHeatmapColors([200], 'Greens');
    }).toThrowError();

    expect(() => {
      getHeatmapColors('help', 'Greens');
    }).toThrowError();

    expect(() => {
      getHeatmapColors(true, 'Greens');
    }).toThrowError();

    expect(() => {
      getHeatmapColors(undefined, 'Greens');
    }).toThrowError();

    expect(() => {
      getHeatmapColors(nullValue, 'Greens');
    }).toThrowError();

    expect(() => {
      getHeatmapColors(emptyObject, 'Greens');
    }).toThrowError();
  });

  it('should throw an error if input is less than 0', () => {
    expect(() => {
      getHeatmapColors(-2, 'Greens');
    }).toThrowError();
  });

  it('should throw an error if input is greater than 1', () => {
    expect(() => {
      getHeatmapColors(2, 'Greens');
    }).toThrowError();
  });

  it('should be a function', () => {
    expect(typeof getHeatmapColors).toBe('function');
  });

  it('should return a color for 10 numbers from 0 to 1', () => {
    const colorRegex = /^rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)$/;
    const schema = 'Greens';
    for (let i = 0; i < 10; i++) {
      expect(getHeatmapColors(i / 10, schema)).toMatch(colorRegex);
    }
  });

  describe('drawColormap function', () => {
    const canvasElement = {
      getContext: jest.fn(() => ({
        fillStyle: null,
        fillRect: jest.fn(),
      })),
    };
    beforeEach(() => {
      jest.spyOn(document, 'createElement').mockImplementation(() => canvasElement as any);
    });

    it('should return canvas element', () => {
      const response = getHeatmapColors.prototype.drawColormap('Greens');
      expect(typeof response).toEqual('object');
      expect(response).toBe(canvasElement);
    });
  });
});
