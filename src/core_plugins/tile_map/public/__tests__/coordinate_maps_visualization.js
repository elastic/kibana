import expect from 'expect.js';
import ngMock from 'ng_mock';
import { CoordinateMapsVisualizationProvider } from '../coordinate_maps_visualization';
import LogstashIndexPatternStubProvider from 'fixtures/stubbed_logstash_index_pattern';
import * as visModule from 'ui/vis';
import { ImageComparator } from 'test_utils/image_comparator';
import sinon from 'sinon';
import dummyESResponse from './dummy_es_response.json';
import initial from './initial.png';
import heatmapRaw from './heatmap_raw.png';

function mockRawData() {
  const stack = [dummyESResponse];
  let node;
  do {
    node = stack.pop();
    if (typeof node === 'object') {
      for (const key in node) {
        if (node.hasOwnProperty(key)) {
          if (key === 'aggConfig') {
            node[key].makeLabel = () => 'foobar';
          }
        }
        stack.push(node[key]);
      }
    }
  } while (stack.length);
}
mockRawData();


const manifestUrl = 'https://staging-dot-catalogue-dot-elastic-layer.appspot.com/v1/manifest';
const tmsManifestUrl = `"https://tiles-maps-stage.elastic.co/v2/manifest`;
const manifest = {
  'services': [{
    'id': 'tiles_v2',
    'name': 'Elastic Tile Service',
    'manifest': tmsManifestUrl,
    'type': 'tms'
  }
  ]
};

const tmsManifest = {
  'services': [{
    'id': 'road_map',
    'url': 'https://tiles.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana',
    'minZoom': 0,
    'maxZoom': 10,
    'attribution': '© [OpenStreetMap](http://www.openstreetmap.org/copyright) © [Elastic Maps Service](https://www.elastic.co/elastic-maps-service)'
  }]
};


const THRESHOLD = 0.45;
const PIXEL_DIFF = 64;

describe('CoordinateMapsVisualizationTest', function () {

  let domNode;
  let CoordinateMapsVisualization;
  let Vis;
  let indexPattern;
  let vis;

  let imageComparator;


  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject((Private, $injector) => {

    Vis = Private(visModule.VisProvider);
    CoordinateMapsVisualization = Private(CoordinateMapsVisualizationProvider);
    indexPattern = Private(LogstashIndexPatternStubProvider);


    const serviceSettings = $injector.get('serviceSettings');
    sinon.stub(serviceSettings, '_getManifest', function (url) {
      let contents = null;
      if (url.startsWith(tmsManifestUrl)) {
        contents = tmsManifest;
      } else if (url.startsWith(manifestUrl)) {
        contents = manifest;
      }
      return {
        data: contents
      };
    });


  }));

  describe('CoordinateMapsVisualization - basics', function () {

    beforeEach(async function () {

      setupDOM('512px', '512px');

      imageComparator = new ImageComparator();
      vis = new Vis(indexPattern, {
        type: 'region_map'
      });
      vis.params = {
        mapType: 'Scaled Circle Markers',
        isDesaturated: true,
        addTooltip: true,
        heatClusterSize: 1.5,
        legendPosition: 'bottomright',
        mapZoom: 2,
        mapCenter: [0, 0],
      };
      const mockAggs = [
        {
          type: {
            type: 'metrics'
          },
          fieldFormatter: (x) => {
            return x;
          },
          makeLabel: () => {
            return 'foobar';
          }
        }, {
          type: {
            type: 'buckets'
          },
          params: { useGeoCentroid: true }
        }];
      vis.getAggConfig = function () {
        return mockAggs;
      };
      vis.aggs = mockAggs;

    });

    afterEach(function () {
      teardownDOM();
      imageComparator.destroy();
    });

    it('should initialize OK', async function () {
      const coordinateMapVisualization = new CoordinateMapsVisualization(domNode, vis);
      await coordinateMapVisualization.render(dummyESResponse, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false
      });

      const mismatchedPixels = await compareImage(initial, 0);
      coordinateMapVisualization.destroy();
      expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);

    });


    it('should toggle to Heatmap OK', async function () {

      const coordinateMapVisualization = new CoordinateMapsVisualization(domNode, vis);
      await coordinateMapVisualization.render(dummyESResponse, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false
      });


      vis.params.mapType = 'Heatmap';
      await coordinateMapVisualization.render(dummyESResponse, {
        resize: false,
        params: true,
        aggs: false,
        data: false,
        uiState: false
      });

      const mismatchedPixels = await compareImage(heatmapRaw, 1);
      coordinateMapVisualization.destroy();
      expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);


    });

    it('should toggle back&forth OK between mapTypes', async function () {

      const coordinateMapVisualization = new CoordinateMapsVisualization(domNode, vis);
      await coordinateMapVisualization.render(dummyESResponse, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false
      });

      vis.params.mapType = 'Heatmap';
      await coordinateMapVisualization.render(dummyESResponse, {
        resize: false,
        params: true,
        aggs: false,
        data: false,
        uiState: false
      });

      vis.params.mapType = 'Scaled Circle Markers';
      await coordinateMapVisualization.render(dummyESResponse, {
        resize: false,
        params: true,
        aggs: false,
        data: false,
        uiState: false
      });

      const mismatchedPixels = await compareImage(initial, 0);
      coordinateMapVisualization.destroy();
      expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);

    });


  });


  async function compareImage(expectedImageSource, index) {
    const elementList = domNode.querySelectorAll('canvas');
    const firstCanvasOnMap = elementList[index];
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

