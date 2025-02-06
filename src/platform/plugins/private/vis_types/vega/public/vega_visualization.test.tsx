/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import 'jest-canvas-mock';
import { render, screen } from '@testing-library/react';

import { VegaVisType, createVegaVisualization } from './vega_visualization';

import vegaliteGraph from './test_utils/vegalite_graph.json';
import vegaGraph from './test_utils/vega_graph.json';

import { VegaParser } from './data_model/vega_parser';
import { SearchAPI } from './data_model/search_api';

import { setInjectedVars, setData, setNotifications } from './services';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { VegaVisualizationDependencies } from './plugin';
import React from 'react';
import { TimeCache } from './data_model/time_cache';

jest.mock('./default_spec', () => ({
  getDefaultSpec: () => jest.requireActual('./test_utils/default.spec.json'),
}));

describe('VegaVisualizations', () => {
  let domNode: HTMLDivElement;
  let VegaVisualization: VegaVisType;
  let vegaVisualizationDependencies: VegaVisualizationDependencies;
  let mockedHeightValue: number;
  let mockedWidthValue: number;

  const coreStart = coreMock.createStart();
  const dataPluginStart = dataPluginMock.createStartContract();
  const dataViewsPluginStart = dataViewPluginMocks.createStartContract();

  const setupDOM = (width = 512, height = 512) => {
    render(<div data-test-subj="vega-vis-text" />);
    domNode = screen.getByTestId('vega-vis-text');
    domNode.style.height = `${height}px`;
    domNode.style.width = `${width}px`;
    mockedWidthValue = width;
    mockedHeightValue = height;

    // rtl does not update client dimensions on element, see https://github.com/testing-library/react-testing-library/issues/353
    jest
      .spyOn(Element.prototype, 'clientHeight', 'get')
      .mockImplementation(() => mockedHeightValue);
    jest.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(() => mockedWidthValue);
  };

  const mockGetServiceSettings = jest.fn() as any;

  beforeEach(() => {
    setInjectedVars({
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

    VegaVisualization = createVegaVisualization(vegaVisualizationDependencies, 'view');
  });

  describe('VegaVisualization - basics', () => {
    beforeEach(async () => {
      setupDOM();
    });

    test('should show vegalite graph and update on resize (may fail in dev env)', async () => {
      const mockedConsoleLog = jest.spyOn(console, 'log'); // mocked console.log to avoid messages in the console when running tests
      mockedConsoleLog.mockImplementation(() => {}); //  comment this line when console logging for debugging comment this line

      let vegaVis: InstanceType<VegaVisType>;
      try {
        vegaVis = new VegaVisualization(domNode, jest.fn());

        const vegaParser = new VegaParser(
          JSON.stringify(vegaliteGraph),
          new SearchAPI({
            search: dataPluginStart.search,
            indexPatterns: dataViewsPluginStart,
            uiSettings: coreStart.uiSettings,
          }),
          new TimeCache(dataPluginStart.query.timefilter.timefilter, 0),
          {},
          mockGetServiceSettings
        );
        await vegaParser.parseAsync();
        await vegaVis.render(vegaParser);
        expect(domNode.innerHTML).toMatchSnapshot();

        mockedWidthValue = 256;
        mockedHeightValue = 250;

        // @ts-expect-error - accessing private member
        await vegaVis.vegaView.resize();

        expect(domNode.innerHTML).toMatchSnapshot();
      } finally {
        vegaVis.destroy();
      }
      // eslint-disable-next-line no-console
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
            indexPatterns: dataViewsPluginStart,
            uiSettings: coreStart.uiSettings,
          }),
          new TimeCache(dataPluginStart.query.timefilter.timefilter, 0),
          {},
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
