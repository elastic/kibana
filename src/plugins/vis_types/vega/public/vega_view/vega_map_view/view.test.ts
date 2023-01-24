/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import 'jest-canvas-mock';

import { VegaMapView } from './view';
import { VegaViewParams } from '../vega_base_view';
import { VegaParser } from '../../data_model/vega_parser';
import { TimeCache } from '../../data_model/time_cache';
import { SearchAPI } from '../../data_model/search_api';
import vegaMap from '../../test_utils/vega_map_test.json';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';

import type { IServiceSettings } from './service_settings/service_settings_types';

import {
  setInjectedVars,
  setData,
  setNotifications,
  setUISettings,
  setDataViews,
} from '../../services';
import { initVegaLayer, initTmsRasterLayer } from './layers';

import { maplibregl } from '@kbn/mapbox-gl';

jest.mock('@kbn/mapbox-gl', () => {
  const zoomTo = jest.fn();
  const setCenter = jest.fn();
  const fitBounds = jest.fn();
  return {
    maplibregl: {
      mocks: {
        zoomTo,
        setCenter,
        fitBounds,
      },
      setRTLTextPlugin: jest.fn(),
      Map: jest.fn().mockImplementation(() => ({
        getLayer: () => '',
        removeLayer: jest.fn(),
        once: (eventName: string, handler: Function) => handler(),
        remove: () => jest.fn(),
        getCanvas: () => ({ clientWidth: 512, clientHeight: 512 }),
        getCenter: () => ({ lat: 20, lng: 20 }),
        getZoom: () => 3,
        zoomTo,
        setCenter,
        fitBounds,
        addControl: jest.fn(),
        addLayer: jest.fn(),
        dragRotate: {
          disable: jest.fn(),
        },
        touchZoomRotate: {
          disableRotation: jest.fn(),
        },
      })),
      MapboxOptions: jest.fn(),
      NavigationControl: jest.fn(),
    },
  };
});

jest.mock('./layers', () => ({
  initVegaLayer: jest.fn(),
  initTmsRasterLayer: jest.fn(),
}));

describe('vega_map_view/view', () => {
  describe('VegaMapView', () => {
    let isUserProvided = true;

    const coreStart = coreMock.createStart();
    const dataPluginStart = dataPluginMock.createStartContract();
    const dataViewsStart = dataViewPluginMocks.createStartContract();
    const mockGetServiceSettings = async () => {
      return {
        getAttributionsFromTMSServce() {
          return [`<a rel=\"noreferrer noopener\" href=\"tms_attributions\"></a>`];
        },
        getTmsService() {
          return {
            getVectorStyleSheet: () => ({
              version: 8,
              sources: {},
              // @ts-expect-error
              layers: [],
            }),
            getMaxZoom: async () => 20,
            getMinZoom: async () => 0,
          };
        },
        getTileMapConfig() {
          return {
            url: 'http://foobar.com/{x}/{y}/{z}',
            options: {
              minZoom: 0,
              maxZoom: 20,
              attribution: 'tilemap-attribution',
            },
          };
        },
        getDefaultTmsLayer() {
          return isUserProvided ? 'TMS in config/kibana.yml' : 'road_map_desaturated';
        },
      } as unknown as IServiceSettings;
    };
    let vegaParser: VegaParser;

    setInjectedVars({
      enableExternalUrls: true,
    });
    setData(dataPluginStart);
    setDataViews(dataViewsStart);
    setNotifications(coreStart.notifications);
    setUISettings(coreStart.uiSettings);

    async function createVegaMapView() {
      await vegaParser.parseAsync();
      return new VegaMapView({
        serviceSettings: await mockGetServiceSettings(),
        vegaParser,
        filterManager: dataPluginStart.query.filterManager,
        timefilter: dataPluginStart.query.timefilter.timefilter,
        fireEvent: (event: any) => {},
        parentEl: document.createElement('div'),
        vegaStateRestorer: {
          save: jest.fn(),
          restore: jest.fn(),
          clear: jest.fn(),
        },
      } as unknown as VegaViewParams);
    }

    let mockedConsoleLog: jest.SpyInstance;

    beforeEach(() => {
      vegaParser = new VegaParser(
        JSON.stringify(vegaMap),
        new SearchAPI({
          search: dataPluginStart.search,
          indexPatterns: dataViewsStart,
          uiSettings: coreStart.uiSettings,
        }),
        new TimeCache(dataPluginStart.query.timefilter.timefilter, 0),
        {},
        mockGetServiceSettings
      );
      mockedConsoleLog = jest.spyOn(console, 'log'); // mocked console.log to avoid messages in the console when running tests
      mockedConsoleLog.mockImplementation(() => {}); //  comment this line when console logging for debugging
    });

    afterEach(() => {
      jest.clearAllMocks();
      mockedConsoleLog.mockRestore();
    });

    test('should be added TmsRasterLayer and do not use tmsService if mapStyle is "user_configured"', async () => {
      isUserProvided = true;
      const vegaMapView = await createVegaMapView();
      await vegaMapView.init();

      const { longitude, latitude, scrollWheelZoom } = vegaMapView._parser.mapConfig;
      expect(maplibregl.Map).toHaveBeenCalledWith({
        style: {
          version: 8,
          sources: {},
          layers: [],
        },
        customAttribution: 'tilemap-attribution',
        container: vegaMapView._$container.get(0),
        minZoom: 0,
        maxZoom: 20,
        zoom: 3,
        scrollZoom: scrollWheelZoom,
        center: [longitude, latitude],
      });
      expect(initTmsRasterLayer).toHaveBeenCalled();
      expect(initVegaLayer).toHaveBeenCalled();
    });

    test('should not be added TmsRasterLayer and use tmsService if mapStyle is not "user_configured"', async () => {
      isUserProvided = false;
      const vegaMapView = await createVegaMapView();
      await vegaMapView.init();

      const { longitude, latitude, scrollWheelZoom } = vegaMapView._parser.mapConfig;
      expect(maplibregl.Map).toHaveBeenCalledWith({
        style: {
          version: 8,
          sources: {},
          layers: [],
        },
        customAttribution: ['<a rel="noreferrer noopener" href="tms_attributions"></a>'],
        container: vegaMapView._$container.get(0),
        minZoom: 0,
        maxZoom: 20,
        zoom: 3,
        scrollZoom: scrollWheelZoom,
        center: [longitude, latitude],
      });
      expect(initTmsRasterLayer).not.toHaveBeenCalled();
      expect(initVegaLayer).toHaveBeenCalled();
    });

    test('should be added NavigationControl', async () => {
      const vegaMapView = await createVegaMapView();
      await vegaMapView.init();

      expect(maplibregl.NavigationControl).toHaveBeenCalled();
    });

    describe('setMapView', () => {
      let vegaMapView: VegaMapView;
      beforeEach(async () => {
        vegaMapView = await createVegaMapView();
        await vegaMapView.init();
        maplibregl.mocks.setCenter.mockReset();
        maplibregl.mocks.zoomTo.mockReset();
        maplibregl.mocks.fitBounds.mockReset();
      });

      test('should set just lat lng', async () => {
        vegaMapView.setMapViewHandler(1, 2);
        expect(maplibregl.mocks.setCenter).toHaveBeenCalledWith({ lat: 1, lng: 2 });
      });

      test('should set just lng lat via array', async () => {
        vegaMapView.setMapViewHandler([1, 2]);
        expect(maplibregl.mocks.setCenter).toHaveBeenCalledWith({ lat: 2, lng: 1 });
      });

      test('should set lat lng and zoom', async () => {
        vegaMapView.setMapViewHandler(1, 2, 6);
        expect(maplibregl.mocks.setCenter).toHaveBeenCalledWith({ lat: 1, lng: 2 });
        expect(maplibregl.mocks.zoomTo).toHaveBeenCalledWith(6);
      });

      test('should set bounds', async () => {
        vegaMapView.setMapViewHandler([
          [1, 2],
          [6, 7],
        ]);
        expect(maplibregl.mocks.fitBounds).toHaveBeenCalledWith([
          { lat: 2, lng: 1 },
          { lat: 7, lng: 6 },
        ]);
      });

      test('should throw on invalid input', async () => {
        expect(() => {
          vegaMapView.setMapViewHandler(undefined);
        }).toThrow();

        expect(() => {
          vegaMapView.setMapViewHandler(['a', 'b'] as unknown as [number, number]);
        }).toThrow();

        expect(() => {
          vegaMapView.setMapViewHandler([1, 2, 3, 4, 5] as unknown as [number, number]);
        }).toThrow();
      });
    });
  });
});
