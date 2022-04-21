/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { ReactWrapper } from 'enzyme';
import type { PersistedState } from '@kbn/visualizations-plugin/public';
import HeatmapOptions, { HeatmapOptionsProps } from './heatmap';
import { findTestSubject } from '@elastic/eui/lib/test';
import { act } from 'react-dom/test-utils';

describe('PalettePicker', function () {
  let props: HeatmapOptionsProps;
  let component: ReactWrapper<HeatmapOptionsProps>;
  const mockState = new Map();
  const uiState = {
    get: jest
      .fn()
      .mockImplementation((key, fallback) => (mockState.has(key) ? mockState.get(key) : fallback)),
    set: jest.fn().mockImplementation((key, value) => mockState.set(key, value)),
    emit: jest.fn(),
    on: jest.fn(),
    setSilent: jest.fn(),
  } as unknown as PersistedState;

  beforeAll(() => {
    props = {
      showElasticChartsOptions: true,
      uiState,
      setValidity: jest.fn(),
      vis: {
        type: {
          editorConfig: {
            collections: {
              legendPositions: [
                {
                  text: 'Top',
                  value: 'top',
                },
                {
                  text: 'Left',
                  value: 'left',
                },
                {
                  text: 'Right',
                  value: 'right',
                },
                {
                  text: 'Bottom',
                  value: 'bottom',
                },
              ],
            },
          },
        },
      },
      stateParams: {
        percentageMode: false,
        addTooltip: true,
        addLegend: true,
        enableHover: false,
        legendPosition: 'right',
        colorsNumber: 8,
        colorSchema: 'Blues',
        setColorRange: false,
        colorsRange: [],
        invertColors: false,
        truncateLegend: true,
        maxLegendLines: 1,
        valueAxes: [
          {
            id: 'ValueAxis-1',
            name: 'LeftAxis-1',
            type: 'value',
            position: 'left',
            show: true,
            style: {},
            scale: {
              type: 'linear',
              mode: 'normal',
            },
            labels: {
              show: true,
              rotate: 0,
              filter: false,
              truncate: 100,
              overwriteColor: true,
            },
            title: {
              text: 'Count',
            },
          },
        ],
      },
      setValue: jest.fn(),
    } as unknown as HeatmapOptionsProps;
  });

  it('renders the long legend options for the elastic charts implementation', async () => {
    component = mountWithIntl(<HeatmapOptions {...props} />);
    await act(async () => {
      expect(findTestSubject(component, 'heatmapLongLegendsOptions').length).toBe(1);
    });
  });

  it('not renders the long legend options for the vislib implementation', async () => {
    component = mountWithIntl(<HeatmapOptions {...props} showElasticChartsOptions={false} />);
    await act(async () => {
      expect(findTestSubject(component, 'heatmapLongLegendsOptions').length).toBe(0);
    });
  });

  it('disables the highlight range switch for the elastic charts implementation', async () => {
    component = mountWithIntl(<HeatmapOptions {...props} />);
    await act(async () => {
      expect(findTestSubject(component, 'heatmapHighlightRange').prop('disabled')).toBeTruthy();
    });
  });

  it('enables the highlight range switch for the vislib implementation', async () => {
    component = mountWithIntl(<HeatmapOptions {...props} showElasticChartsOptions={false} />);
    await act(async () => {
      expect(findTestSubject(component, 'heatmapHighlightRange').prop('disabled')).toBeFalsy();
    });
  });

  it('disables the color scale dropdown for the elastic charts implementation', async () => {
    component = mountWithIntl(<HeatmapOptions {...props} />);
    await act(async () => {
      expect(findTestSubject(component, 'heatmapColorScale').prop('disabled')).toBeTruthy();
    });
  });

  it('enables the color scale dropdown for the vislib implementation', async () => {
    component = mountWithIntl(<HeatmapOptions {...props} showElasticChartsOptions={false} />);
    await act(async () => {
      expect(findTestSubject(component, 'heatmapColorScale').prop('disabled')).toBeFalsy();
    });
  });

  it('not renders the scale to data bounds switch for the elastic charts implementation', async () => {
    component = mountWithIntl(<HeatmapOptions {...props} />);
    await act(async () => {
      expect(findTestSubject(component, 'heatmapScaleToDataBounds').length).toBe(0);
    });
  });

  it('renders the scale to data bounds for the vislib implementation', async () => {
    component = mountWithIntl(<HeatmapOptions {...props} showElasticChartsOptions={false} />);
    await act(async () => {
      expect(findTestSubject(component, 'heatmapScaleToDataBounds').length).toBe(1);
    });
  });

  it('disables the labels rotate for the elastic charts implementation', async () => {
    component = mountWithIntl(<HeatmapOptions {...props} />);
    await act(async () => {
      expect(findTestSubject(component, 'heatmapLabelsRotate').prop('disabled')).toBeTruthy();
    });
  });

  it('enables the labels rotate for the vislib implementation', async () => {
    component = mountWithIntl(<HeatmapOptions {...props} showElasticChartsOptions={false} />);
    await act(async () => {
      expect(findTestSubject(component, 'heatmapLabelsRotate').prop('disabled')).toBeFalsy();
    });
  });

  it('disables the overwtite color switch for the elastic charts implementation', async () => {
    component = mountWithIntl(<HeatmapOptions {...props} />);
    await act(async () => {
      expect(
        findTestSubject(component, 'heatmapLabelsOverwriteColor').prop('disabled')
      ).toBeTruthy();
    });
  });

  it('enables the overwtite color switch for the vislib implementation', async () => {
    component = mountWithIntl(<HeatmapOptions {...props} showElasticChartsOptions={false} />);
    await act(async () => {
      expect(
        findTestSubject(component, 'heatmapLabelsOverwriteColor').prop('disabled')
      ).toBeFalsy();
    });
  });

  it('disables the color picker for the elastic charts implementation', async () => {
    component = mountWithIntl(<HeatmapOptions {...props} />);
    await act(async () => {
      expect(findTestSubject(component, 'heatmapLabelsColor').prop('disabled')).toBeTruthy();
    });
  });

  it('enables the color picker for the vislib implementation', async () => {
    component = mountWithIntl(<HeatmapOptions {...props} showElasticChartsOptions={false} />);
    await act(async () => {
      expect(findTestSubject(component, 'heatmapLabelsColor').prop('disabled')).toBeFalsy();
    });
  });
});
