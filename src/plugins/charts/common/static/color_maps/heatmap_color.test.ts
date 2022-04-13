/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
