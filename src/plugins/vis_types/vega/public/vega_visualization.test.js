/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import 'jest-canvas-mock';

import $ from 'jquery';

import { createVegaVisualization } from './vega_visualization';

import vegaliteGraph from './test_utils/vegalite_graph.json';
import vegaGraph from './test_utils/vega_graph.json';

import { VegaParser } from './data_model/vega_parser';
import { SearchAPI } from './data_model/search_api';

import { setInjectedVars, setData, setNotifications } from './services';
import { coreMock } from '../../../../core/public/mocks';
import { dataPluginMock } from '../../../data/public/mocks';

jest.mock('./default_spec', () => ({
  getDefaultSpec: () => jest.requireActual('./test_utils/default.spec.json'),
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

  const mockGetServiceSettings = () => {
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

    test('should show vegalite graph and update on resize (may fail in dev env)', async () => {
      const mockedConsoleLog = jest.spyOn(console, 'log'); // mocked console.log to avoid messages in the console when running tests
      mockedConsoleLog.mockImplementation(() => {}); //  comment this line when console logging for debugging comment this line

      let vegaVis;
      try {
        vegaVis = new VegaVisualization(domNode, jest.fn());

        const vegaParser = new VegaParser(
          JSON.stringify(vegaliteGraph),
          new SearchAPI({
            search: dataPluginStart.search,
            indexPatterns: dataPluginStart.indexPatterns,
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
        mockedHeightValue = 250;

        await vegaVis.vegaView.resize();

        expect(domNode.innerHTML).toMatchSnapshot();
      } finally {
        vegaVis.destroy();
      }
      expect(console.log).toBeCalledTimes(2);
      mockedConsoleLog.mockRestore();
    });

    test('should show vega graph (may fail in dev env)', async () => {
      let vegaVis;
      try {
        vegaVis = new VegaVisualization(domNode, jest.fn());
        const vegaParser = new VegaParser(
          JSON.stringify(vegaGraph),
          new SearchAPI({
            search: dataPluginStart.search,
            indexPatterns: dataPluginStart.indexPatterns,
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
  });
});
