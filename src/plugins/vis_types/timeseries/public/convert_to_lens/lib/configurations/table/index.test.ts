/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSeries } from '../../__mocks__';
import { getColumnState } from '.';

const mockGetPalette = jest.fn();

jest.mock('../palette', () => ({
  getPalette: jest.fn(() => mockGetPalette()),
}));

describe('getColumnState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPalette.mockReturnValue({ id: 'custom' });
  });

  test('should return column state without palette if series is not provided', () => {
    const config = getColumnState('test');
    expect(config).toEqual({
      columnId: 'test',
      alignment: 'left',
      colorMode: 'none',
    });
    expect(mockGetPalette).toBeCalledTimes(0);
  });

  test('should return column state with palette if series is provided', () => {
    const config = getColumnState('test', undefined, createSeries());
    expect(config).toEqual({
      columnId: 'test',
      alignment: 'left',
      colorMode: 'text',
      palette: { id: 'custom' },
    });
    expect(mockGetPalette).toBeCalledTimes(1);
  });

  test('should return column state with collapseFn if collapseFn is provided', () => {
    const config = getColumnState('test', 'max', createSeries());
    expect(config).toEqual({
      columnId: 'test',
      alignment: 'left',
      colorMode: 'text',
      palette: { id: 'custom' },
      collapseFn: 'max',
    });
    expect(mockGetPalette).toBeCalledTimes(1);
  });
});
