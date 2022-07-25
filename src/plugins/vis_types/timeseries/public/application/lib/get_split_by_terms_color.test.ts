/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { getSplitByTermsColor, SplitByTermsColorProps } from './get_split_by_terms_color';

const chartsRegistry = chartPluginMock.createPaletteRegistry();
const props = {
  seriesById: [
    {
      id: '61ca57f1-469d-11e7-af02-69e470af7417',
      label: 'Count',
      color: 'rgb(104, 188, 0)',
      data: [
        [1615273200000, 45],
        [1615284000000, 78],
      ],
      seriesId: '61ca57f1-469d-11e7-af02-69e470af7417',
      stack: 'none',
      lines: {
        show: true,
        fill: 0.5,
        lineWidth: 1,
        steps: false,
      },
      points: {
        show: true,
        radius: 1,
        lineWidth: 1,
      },
      bars: {
        show: false,
        fill: 0.5,
        lineWidth: 1,
      },
      groupId: 'yaxis_2b3507e0-8630-11eb-b627-ff396f1f7246_main_group',
      yScaleType: 'linear',
    },
  ],
  seriesName: 'Count',
  seriesId: '61ca57f1-469d-11e7-af02-69e470af7417',
  baseColor: '#68BC00',
  seriesPalette: {
    name: 'rainbow',
    params: {
      colors: ['#0F1419', '#666666'],
      gradient: false,
    },
    type: 'palette',
  },
  palettesRegistry: chartsRegistry,
  syncColors: false,
} as unknown as SplitByTermsColorProps;

describe('getSplitByTermsColor Function', () => {
  it('Should return null if no palette given', () => {
    const newProps = { ...props, seriesPalette: null } as unknown as SplitByTermsColorProps;
    const color = getSplitByTermsColor(newProps);
    expect(color).toEqual(null);
  });

  it('Should return color for empty seriesName', () => {
    const newProps = { ...props, seriesName: '' };
    const color = getSplitByTermsColor(newProps);
    expect(color).toEqual('blue');
  });

  it('Should return color for the given palette', () => {
    const color = getSplitByTermsColor(props);
    expect(color).toEqual('blue');
  });

  it('Should call the `get` palette method with the correct arguments', () => {
    const spy = jest.spyOn(chartsRegistry, 'get');
    const gradientPalette = {
      name: 'gradient',
      params: {
        colors: ['#68BC00', '#666666'],
        gradient: true,
      },
    };
    const newProps = {
      ...props,
      seriesPalette: gradientPalette,
    } as unknown as SplitByTermsColorProps;
    getSplitByTermsColor(newProps);
    expect(spy).toHaveBeenCalledWith('custom');
  });
});
