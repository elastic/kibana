/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ColorsService } from './colors_service';
import type { PersistedState } from '../../../../visualizations/public';

describe('ColorsService', () => {
  const mockState = new Map();
  const uiState = ({
    get: jest
      .fn()
      .mockImplementation((key, fallback) => (mockState.has(key) ? mockState.get(key) : fallback)),
    set: jest.fn().mockImplementation((key, value) => mockState.set(key, value)),
    emit: jest.fn(),
    setSilent: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  } as unknown) as PersistedState;

  it('Should return null if user has not assigned any color', () => {
    const colorsService = new ColorsService(uiState);
    const color = colorsService.getSeriesColor('testid', 'Logstash Airways', '');
    expect(color).toEqual(null);
  });

  it('Should return null if user has not assigned any color for the specific label', () => {
    uiState.set('vis.colors', [
      {
        id: '61ca57f1-469d-11e7-af02-69e470af7417',
        overwrite: {
          Count: '#4CE7A6',
        },
      },
      {
        id: '61ca57f1-469d-11e7-af02-69e470af7417:JetBeats',
        overwrite: {
          JetBeats: '#6092C0',
        },
      },
      {
        id: '61ca57f1-469d-11e7-af02-69e470af7417:Logstash Airways',
        overwrite: {
          true: '#F9934E',
        },
      },
    ]);
    const colorsService = new ColorsService(uiState);
    const color = colorsService.getSeriesColor(
      '61ca57f1-469d-11e7-af02-69e470af7417s',
      'other label',
      ''
    );
    expect(color).toEqual(null);
  });

  it('Should return the color if user has assigned a color for the specific label', () => {
    const colorsService = new ColorsService(uiState);
    const color = colorsService.getSeriesColor(
      '61ca57f1-469d-11e7-af02-69e470af7417:JetBeats',
      'JetBeats',
      ''
    );
    expect(color).toEqual('#6092C0');
  });

  it('Should return the color if user has assigned a color for the specific formatted label', () => {
    const colorsService = new ColorsService(uiState);
    const color = colorsService.getSeriesColor(
      '61ca57f1-469d-11e7-af02-69e470af7417:Logstash Airways',
      '1',
      'true'
    );
    expect(color).toEqual('#F9934E');
  });

  it('Should add a new color to the uiState', () => {
    uiState.set('vis.colors', []);
    const colorsService = new ColorsService(uiState);
    colorsService.addToUiState('test', 'id:test', '#0000FF');
    const colors = uiState.get('vis.colors', []);
    expect(colors).toStrictEqual([
      {
        id: 'id:test',
        overwrite: {
          test: '#0000FF',
        },
      },
    ]);
  });

  it('Should delete the color from the uiState', () => {
    uiState.set('vis.colors', []);
    const colorsService = new ColorsService(uiState);
    colorsService.deleteFromUiState('test', 'id:test');
    const colors = uiState.get('vis.colors', []);
    expect(colors).toStrictEqual([]);
  });
});
