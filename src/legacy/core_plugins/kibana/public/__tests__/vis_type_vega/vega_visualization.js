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

import Bluebird from 'bluebird';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import $ from 'jquery';

import 'leaflet/dist/leaflet.js';
import 'leaflet-vega';
// Will be replaced with new path when tests are moved
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { createVegaVisualization } from '../../../../../../plugins/vis_type_vega/public/vega_visualization';
import { ImageComparator } from 'test_utils/image_comparator';

import vegaliteGraph from '!!raw-loader!./vegalite_graph.hjson';
import vegaliteImage256 from './vegalite_image_256.png';
import vegaliteImage512 from './vegalite_image_512.png';

import vegaGraph from '!!raw-loader!./vega_graph.hjson';
import vegaImage512 from './vega_image_512.png';

import vegaTooltipGraph from '!!raw-loader!./vega_tooltip_test.hjson';

import vegaMapGraph from '!!raw-loader!./vega_map_test.hjson';
import vegaMapImage256 from './vega_map_image_256.png';
// Will be replaced with new path when tests are moved
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { VegaParser } from '../../../../../../plugins/vis_type_vega/public/data_model/vega_parser';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { SearchAPI } from '../../../../../../plugins/vis_type_vega/public/data_model/search_api';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { createVegaTypeDefinition } from '../../../../../../plugins/vis_type_vega/public/vega_type';
// TODO This is an integration test and thus requires a running platform. When moving to the new platform,
// this test has to be migrated to the newly created integration test environment.
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { npStart } from 'ui/new_platform';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { BaseVisType } from '../../../../../../plugins/visualizations/public/vis_types/base_vis_type';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ExprVis } from '../../../../../../plugins/visualizations/public/expressions/vis';

import {
  setInjectedVars,
  setData,
  setSavedObjects,
  setNotifications,
  setKibanaMapFactory,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../plugins/vis_type_vega/public/services';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ServiceSettings } from '../../../../../../plugins/maps_legacy/public/map/service_settings';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { KibanaMap } from '../../../../../../plugins/maps_legacy/public/map/kibana_map';

const THRESHOLD = 0.1;
const PIXEL_DIFF = 30;

describe('VegaVisualizations', () => {
  let domNode;
  let VegaVisualization;
  let vis;
  let imageComparator;
  let vegaVisualizationDependencies;
  let vegaVisType;

  setKibanaMapFactory((...args) => new KibanaMap(...args));
  setInjectedVars({
    emsTileLayerId: {},
    enableExternalUrls: true,
    esShardTimeout: 10000,
  });
  setData(npStart.plugins.data);
  setSavedObjects(npStart.core.savedObjects);
  setNotifications(npStart.core.notifications);

  const mockMapConfig = {
    includeElasticMapsService: true,
    proxyElasticMapsServiceInMaps: false,
    tilemap: {
      deprecated: {
        config: {
          options: {
            attribution: '',
          },
        },
      },
      options: {
        attribution: '',
        minZoom: 0,
        maxZoom: 10,
      },
    },
    regionmap: {
      includeElasticMapsService: true,
      layers: [],
    },
    manifestServiceUrl: '',
    emsFileApiUrl: 'https://vector.maps.elastic.co',
    emsTileApiUrl: 'https://tiles.maps.elastic.co',
    emsLandingPageUrl: 'https://maps.elastic.co/v7.7',
    emsFontLibraryUrl: 'https://tiles.maps.elastic.co/fonts/{fontstack}/{range}.pbf',
    emsTileLayerId: {
      bright: 'road_map',
      desaturated: 'road_map_desaturated',
      dark: 'dark_map',
    },
  };

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(() => {
      const serviceSettings = new ServiceSettings(mockMapConfig, mockMapConfig.tilemap);
      vegaVisualizationDependencies = {
        serviceSettings,
        core: {
          uiSettings: npStart.core.uiSettings,
        },
        plugins: {
          data: {
            query: {
              timefilter: {
                timefilter: {},
              },
            },
          },
        },
      };

      vegaVisType = new BaseVisType(createVegaTypeDefinition(vegaVisualizationDependencies));
      VegaVisualization = createVegaVisualization(vegaVisualizationDependencies);
    })
  );

  describe('VegaVisualization - basics', () => {
    beforeEach(async function () {
      setupDOM('512px', '512px');
      imageComparator = new ImageComparator();

      vis = new ExprVis({
        type: vegaVisType,
      });
    });

    afterEach(function () {
      teardownDOM();
      imageComparator.destroy();
    });

    it('should show vegalite graph and update on resize (may fail in dev env)', async function () {
      let vegaVis;
      try {
        vegaVis = new VegaVisualization(domNode, vis);

        const vegaParser = new VegaParser(
          vegaliteGraph,
          new SearchAPI({
            search: npStart.plugins.data.search,
            uiSettings: npStart.core.uiSettings,
            injectedMetadata: npStart.core.injectedMetadata,
          })
        );
        await vegaParser.parseAsync();

        await vegaVis.render(vegaParser, vis.params, { data: true });
        const mismatchedPixels1 = await compareImage(vegaliteImage512);
        expect(mismatchedPixels1).to.be.lessThan(PIXEL_DIFF);

        domNode.style.width = '256px';
        domNode.style.height = '256px';

        await vegaVis.render(vegaParser, vis.params, { resize: true });
        const mismatchedPixels2 = await compareImage(vegaliteImage256);
        expect(mismatchedPixels2).to.be.lessThan(PIXEL_DIFF);
      } finally {
        vegaVis.destroy();
      }
    });

    it('should show vega graph (may fail in dev env)', async function () {
      let vegaVis;
      try {
        vegaVis = new VegaVisualization(domNode, vis);
        const vegaParser = new VegaParser(
          vegaGraph,
          new SearchAPI({
            search: npStart.plugins.data.search,
            uiSettings: npStart.core.uiSettings,
            injectedMetadata: npStart.core.injectedMetadata,
          })
        );
        await vegaParser.parseAsync();

        await vegaVis.render(vegaParser, vis.params, { data: true });
        const mismatchedPixels = await compareImage(vegaImage512);

        expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);
      } finally {
        vegaVis.destroy();
      }
    });

    it('should show vegatooltip on mouseover over a vega graph (may fail in dev env)', async () => {
      let vegaVis;
      try {
        vegaVis = new VegaVisualization(domNode, vis);
        const vegaParser = new VegaParser(
          vegaTooltipGraph,
          new SearchAPI({
            search: npStart.plugins.data.search,
            uiSettings: npStart.core.uiSettings,
            injectedMetadata: npStart.core.injectedMetadata,
          })
        );
        await vegaParser.parseAsync();
        await vegaVis.render(vegaParser, vis.params, { data: true });

        const $el = $(domNode);
        const offset = $el.offset();

        const event = new MouseEvent('mousemove', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: offset.left + 10,
          clientY: offset.top + 10,
        });

        $el.find('canvas')[0].dispatchEvent(event);

        await Bluebird.delay(10);

        let tooltip = document.getElementById('vega-kibana-tooltip');
        expect(tooltip).to.be.ok();
        expect(tooltip.innerHTML).to.be(
          '<h2>This is a long title</h2>' +
            '<table><tbody>' +
            '<tr><td class="key">fieldA:</td><td class="value">value of fld1</td></tr>' +
            '<tr><td class="key">fld2:</td><td class="value">42</td></tr>' +
            '</tbody></table>'
        );

        vegaVis.destroy();

        tooltip = document.getElementById('vega-kibana-tooltip');
        expect(tooltip).to.not.be.ok();
      } finally {
        vegaVis.destroy();
      }
    });

    it('should show vega blank rectangle on top of a map (vegamap)', async () => {
      let vegaVis;
      try {
        vegaVis = new VegaVisualization(domNode, vis);
        const vegaParser = new VegaParser(
          vegaMapGraph,
          new SearchAPI({
            search: npStart.plugins.data.search,
            uiSettings: npStart.core.uiSettings,
            injectedMetadata: npStart.core.injectedMetadata,
          })
        );
        await vegaParser.parseAsync();

        domNode.style.width = '256px';
        domNode.style.height = '256px';

        await vegaVis.render(vegaParser, vis.params, { data: true });
        const mismatchedPixels = await compareImage(vegaMapImage256);
        expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);
      } finally {
        vegaVis.destroy();
      }
    });

    it('should add a small subpixel value to the height of the canvas to avoid getting it set to 0', async () => {
      let vegaVis;
      try {
        vegaVis = new VegaVisualization(domNode, vis);
        const vegaParser = new VegaParser(
          `{
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            "marks": [
              {
                "type": "text",
                "encode": {
                  "update": {
                    "text": {
                      "value": "Test"
                    },
                    "align": {"value": "center"},
                    "baseline": {"value": "middle"},
                    "xc": {"signal": "width/2"},
                    "yc": {"signal": "height/2"}
                    fontSize: {value: "14"}
                  }
                }
              }
            ]
          }`,
          new SearchAPI({
            search: npStart.plugins.data.search,
            uiSettings: npStart.core.uiSettings,
            injectedMetadata: npStart.core.injectedMetadata,
          })
        );
        await vegaParser.parseAsync();

        domNode.style.width = '256px';
        domNode.style.height = '256px';

        await vegaVis.render(vegaParser, vis.params, { data: true });
        const vegaView = vegaVis._vegaView._view;
        expect(vegaView.height()).to.be(250.00000001);
      } finally {
        vegaVis.destroy();
      }
    });
  });

  async function compareImage(expectedImageSource) {
    const elementList = domNode.querySelectorAll('canvas');
    expect(elementList.length).to.equal(1);
    const firstCanvasOnMap = elementList[0];
    return imageComparator.compareImage(firstCanvasOnMap, expectedImageSource, THRESHOLD);
  }

  function setupDOM(width, height) {
    domNode = document.createElement('div');
    domNode.style.top = '0';
    domNode.style.left = '0';
    domNode.style.width = width;
    domNode.style.height = height;
    domNode.style.position = 'fixed';
    domNode.style.border = '1px solid blue';
    domNode.style['pointer-events'] = 'none';
    document.body.appendChild(domNode);
  }

  function teardownDOM() {
    domNode.innerHTML = '';
    document.body.removeChild(domNode);
  }
});
