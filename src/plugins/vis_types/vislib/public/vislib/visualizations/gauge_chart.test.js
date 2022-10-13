/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import $ from 'jquery';
import _ from 'lodash';
import { setHTMLElementClientSizes, setSVGElementGetBBox } from '@kbn/test-jest-helpers';

import data from '../../fixtures/mock_data/terms/_series_multiple';
import { getMockUiState } from '../../fixtures/mocks';
import { getVis } from './_vis_fixture';

describe('Vislib Gauge Chart Test Suite', function () {
  let vis;
  let chartEl;
  const vislibParams = {
    type: 'gauge',
    addTooltip: true,
    addLegend: false,
    gauge: {
      alignment: 'horizontal',
      autoExtend: false,
      percentageMode: false,
      gaugeStyle: 'Full',
      backStyle: 'Full',
      orientation: 'vertical',
      colorSchema: 'Green to Red',
      colorsRange: [
        { from: 0, to: 1500 },
        { from: 1500, to: 2500 },
        { from: 2500, to: 3000 },
      ],
      invertColors: false,
      labels: {
        show: true,
        color: 'black',
      },
      scale: {
        show: true,
        labels: false,
        color: '#333',
        width: 2,
      },
      type: 'meter',
      style: {
        bgWidth: 0.9,
        width: 0.9,
        mask: false,
        bgMask: false,
        maskBars: 50,
        bgFill: '#eee',
        subText: '',
        fontSize: 32,
      },
    },
  };

  function generateVis(opts = {}) {
    const config = _.defaultsDeep({}, opts, vislibParams);
    if (vis) {
      vis.destroy();
      $('.visChart').remove();
    }
    vis = getVis(config);
    vis.on('brush', _.noop);
    vis.render(data, getMockUiState());
    chartEl = vis.handler.charts[0].chartEl;
  }

  let mockedHTMLElementClientSizes;
  let mockedSVGElementGetBBox;

  beforeAll(() => {
    mockedHTMLElementClientSizes = setHTMLElementClientSizes(512, 512);
    mockedSVGElementGetBBox = setSVGElementGetBBox(100);
  });

  beforeEach(() => {
    generateVis();
  });

  afterEach(function () {
    vis.destroy();
    $('.visChart').remove();
  });

  afterAll(function () {
    mockedHTMLElementClientSizes.mockRestore();
    mockedSVGElementGetBBox.mockRestore();
  });

  test('creates meter gauge', function () {
    expect($(chartEl).find('svg').length).toEqual(5);
    expect($(chartEl).find('svg > g > g > text').text()).toEqual('2820231918357341352');
  });

  test('creates circle gauge', function () {
    generateVis({
      gauge: {
        minAngle: 0,
        maxAngle: 2 * Math.PI,
      },
    });
    expect($(chartEl).find('svg').length).toEqual(5);
  });

  test('creates gauge with automatic mode', function () {
    generateVis({
      gauge: {
        alignment: 'automatic',
      },
    });
    expect($(chartEl).find('svg')[0].getAttribute('width')).toEqual('97');
  });

  test('creates gauge with vertical mode', function () {
    generateVis({
      gauge: {
        alignment: 'vertical',
      },
    });
    expect($(chartEl).find('svg').width()).toEqual($(chartEl).width());
  });

  test('applies range settings correctly', function () {
    const paths = $(chartEl).find('svg > g > g:nth-child(1) > path:nth-child(2)');
    const fills = [];
    paths.each(function () {
      fills.push(this.style.fill);
    });
    expect(fills).toEqual([
      'rgb(165,0,38)',
      'rgb(254,254,189)',
      'rgb(254,254,189)',
      'rgb(0,104,55)',
      'rgb(0,104,55)',
    ]);
  });

  test('applies color schema correctly', function () {
    generateVis({
      gauge: {
        colorSchema: 'Blues',
      },
    });
    const paths = $(chartEl).find('svg > g > g:nth-child(1) > path:nth-child(2)');
    const fills = [];
    paths.each(function () {
      fills.push(this.style.fill);
    });
    expect(fills).toEqual([
      'rgb(8,48,107)',
      'rgb(109,174,213)',
      'rgb(109,174,213)',
      'rgb(247,251,255)',
      'rgb(247,251,255)',
    ]);
  });
});
