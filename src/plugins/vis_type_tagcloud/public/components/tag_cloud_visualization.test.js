/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import 'jest-canvas-mock';

import { TagCloudVisualization } from './tag_cloud_visualization';
import { setFormatService } from '../services';
import { dataPluginMock } from '../../../data/public/mocks';
import { setHTMLElementOffset, setSVGElementGetBBox } from '@kbn/test/jest';

const seedColors = ['#00a69b', '#57c17b', '#6f87d8', '#663db8', '#bc52bc', '#9e3533', '#daa05d'];

describe('TagCloudVisualizationTest', () => {
  let domNode;
  let visParams;
  let SVGElementGetBBoxSpyInstance;
  let HTMLElementOffsetMockInstance;

  const dummyTableGroup = {
    columns: [
      {
        id: 'col-0',
        title: 'geo.dest: Descending',
      },
      {
        id: 'col-1',
        title: 'Count',
      },
    ],
    rows: [
      { 'col-0': 'CN', 'col-1': 26 },
      { 'col-0': 'IN', 'col-1': 17 },
      { 'col-0': 'US', 'col-1': 6 },
      { 'col-0': 'DE', 'col-1': 4 },
      { 'col-0': 'BR', 'col-1': 3 },
    ],
  };

  const originTransformSVGElement = window.SVGElement.prototype.transform;

  beforeAll(() => {
    setFormatService(dataPluginMock.createStartContract().fieldFormats);
    Object.defineProperties(window.SVGElement.prototype, {
      transform: {
        get: () => ({
          baseVal: {
            consolidate: () => {},
          },
        }),
        configurable: true,
      },
    });
  });

  afterAll(() => {
    SVGElementGetBBoxSpyInstance.mockRestore();
    HTMLElementOffsetMockInstance.mockRestore();
    window.SVGElement.prototype.transform = originTransformSVGElement;
  });

  describe('TagCloudVisualization - basics', () => {
    beforeEach(async () => {
      setupDOM(512, 512);

      visParams = {
        bucket: { accessor: 0, format: {} },
        metric: { accessor: 0, format: {} },
        scale: 'linear',
        orientation: 'single',
      };
    });

    test('simple draw', async () => {
      const tagcloudVisualization = new TagCloudVisualization(domNode, {
        seedColors,
      });

      await tagcloudVisualization.render(dummyTableGroup, visParams);

      const svgNode = domNode.querySelector('svg');
      expect(svgNode.outerHTML).toMatchSnapshot();
    });

    test('with resize', async () => {
      const tagcloudVisualization = new TagCloudVisualization(domNode, {
        seedColors,
      });
      await tagcloudVisualization.render(dummyTableGroup, visParams);

      await tagcloudVisualization.render(dummyTableGroup, visParams);

      const svgNode = domNode.querySelector('svg');
      expect(svgNode.outerHTML).toMatchSnapshot();
    });

    test('with param change', async function () {
      const tagcloudVisualization = new TagCloudVisualization(domNode, {
        seedColors,
      });
      await tagcloudVisualization.render(dummyTableGroup, visParams);

      SVGElementGetBBoxSpyInstance.mockRestore();
      SVGElementGetBBoxSpyInstance = setSVGElementGetBBox(256, 368);

      HTMLElementOffsetMockInstance.mockRestore();
      HTMLElementOffsetMockInstance = setHTMLElementOffset(256, 386);

      visParams.orientation = 'right angled';
      visParams.minFontSize = 70;
      await tagcloudVisualization.render(dummyTableGroup, visParams);

      const svgNode = domNode.querySelector('svg');
      expect(svgNode.outerHTML).toMatchSnapshot();
    });
  });

  function setupDOM(width, height) {
    domNode = document.createElement('div');

    HTMLElementOffsetMockInstance = setHTMLElementOffset(width, height);
    SVGElementGetBBoxSpyInstance = setSVGElementGetBBox(width, height);
  }
});
