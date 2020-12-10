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

import 'jest-canvas-mock';

import $ from 'jquery';

import 'leaflet/dist/leaflet.js';
import 'leaflet-vega';
import { createVegaVisualization } from './vega_visualization';

import vegaliteGraph from './test_utils/vegalite_graph.json';
import vegaGraph from './test_utils/vega_graph.json';
import vegaMapGraph from './test_utils/vega_map_test.json';

import { VegaParser } from './data_model/vega_parser';
import { SearchAPI } from './data_model/search_api';

import { setInjectedVars, setData, setNotifications } from './services';
import { coreMock } from '../../../core/public/mocks';
import { dataPluginMock } from '../../data/public/mocks';

jest.mock('./default_spec', () => ({
  getDefaultSpec: () => jest.requireActual('./test_utils/default.spec.json'),
}));

jest.mock('./lib/vega', () => ({
  vega: jest.requireActual('vega'),
  vegaLite: jest.requireActual('vega-lite'),
}));

// FLAKY: https://github.com/elastic/kibana/issues/71713
describe('VegaVisualizations', () => {
  let domNode;
  let VegaVisualization;
  let vegaVisualizationDependencies;

  let mockWidth;
  let mockedWidthValue;
  let mockHeight;
  let mockedHeightValue;

  const coreStart = coreMock.createStart();
  const dataPluginStart = dataPluginMock.createStartContract();

  const setupDOM = (width = 512, height = 512) => {
    mockedWidthValue = width;
    mockedHeightValue = height;
    domNode = document.createElement('div');

    mockWidth = jest.spyOn($.prototype, 'width').mockImplementation(() => mockedWidthValue);
    mockHeight = jest.spyOn($.prototype, 'height').mockImplementation(() => mockedHeightValue);
  };

  const mockGetServiceSettings = async () => {
    return {};
  };

  beforeEach(() => {
    setInjectedVars({
      emsTileLayerId: {},
      enableExternalUrls: true,
    });
    setData(dataPluginStart);
    setNotifications(coreStart.notifications);

    vegaVisualizationDependencies = {
      core: coreMock.createSetup(),
      plugins: {
        data: dataPluginMock.createSetupContract(),
      },
      getServiceSettings: mockGetServiceSettings,
    };

    VegaVisualization = createVegaVisualization(vegaVisualizationDependencies);
  });

  describe('VegaVisualization - basics', () => {
    beforeEach(async () => {
      setupDOM();
    });

    afterEach(() => {
      mockWidth.mockRestore();
      mockHeight.mockRestore();
    });

    // SKIP: https://github.com/elastic/kibana/issues/83385
    test.skip('should show vegalite graph and update on resize (may fail in dev env)', async () => {
      let vegaVis;
      try {
        vegaVis = new VegaVisualization(domNode, jest.fn());

        const vegaParser = new VegaParser(
          JSON.stringify(vegaliteGraph),
          new SearchAPI({
            search: dataPluginStart.search,
            uiSettings: coreStart.uiSettings,
            injectedMetadata: coreStart.injectedMetadata,
          }),
          0,
          0,
          mockGetServiceSettings
        );
        await vegaParser.parseAsync();
        await vegaVis.render(vegaParser);
        expect(domNode.innerHTML).toMatchSnapshot();

        mockedWidthValue = 256;
        mockedHeightValue = 256;

        await vegaVis.vegaView.resize();

        expect(domNode.innerHTML).toMatchSnapshot();
      } finally {
        vegaVis.destroy();
      }
    });

    // SKIP: https://github.com/elastic/kibana/issues/83385
    test.skip('should show vega graph (may fail in dev env)', async () => {
      let vegaVis;
      try {
        vegaVis = new VegaVisualization(domNode, jest.fn());
        const vegaParser = new VegaParser(
          JSON.stringify(vegaGraph),
          new SearchAPI({
            search: dataPluginStart.search,
            uiSettings: coreStart.uiSettings,
            injectedMetadata: coreStart.injectedMetadata,
          }),
          0,
          0,
          mockGetServiceSettings
        );
        await vegaParser.parseAsync();

        await vegaVis.render(vegaParser);
        expect(domNode.innerHTML).toMatchSnapshot();
      } finally {
        vegaVis.destroy();
      }
    });

    test('should show vega blank rectangle on top of a map (vegamap)', async () => {
      let vegaVis;
      try {
        vegaVis = new VegaVisualization(domNode, jest.fn());
        const vegaParser = new VegaParser(
          JSON.stringify(vegaMapGraph),
          new SearchAPI({
            search: dataPluginStart.search,
            uiSettings: coreStart.uiSettings,
            injectedMetadata: coreStart.injectedMetadata,
          }),
          0,
          0,
          mockGetServiceSettings
        );
        await vegaParser.parseAsync();

        mockedWidthValue = 256;
        mockedHeightValue = 256;

        await vegaVis.render(vegaParser);
        expect(domNode.innerHTML).toMatchSnapshot();
      } finally {
        vegaVis.destroy();
      }
    });
  });
});
