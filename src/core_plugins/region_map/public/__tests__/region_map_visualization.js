import expect from 'expect.js';
import ngMock from 'ng_mock';
import { RegionMapsVisualizationProvider } from '../region_map_visualization';
import ChoroplethLayer from '../choropleth_layer';
import LogstashIndexPatternStubProvider from 'fixtures/stubbed_logstash_index_pattern';
import * as visModule from 'ui/vis';
import sinon from 'sinon';
import worldJson from './world.json';
import initialPng from './initial.png';
import pixelmatch from 'pixelmatch';

const manifestUrl = 'https://staging-dot-catalogue-dot-elastic-layer.appspot.com/v1/manifest';
const tmsManifestUrl = `"https://tiles-maps-stage.elastic.co/v2/manifest`;
const vectorManifestUrl = `"https://staging-dot-elastic-layer.appspot.com/v1/manifest`;
const manifest = {
  'services': [{
    'id': 'tiles_v2',
    'name': 'Elastic Tile Service',
    'manifest': tmsManifestUrl,
    'type': 'tms'
  },
  {
    'id': 'geo_layers',
    'name': 'Elastic Layer Service',
    'manifest': vectorManifestUrl,
    'type': 'file'
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

const vectorManifest = {
  'layers': [{
    'attribution': '',
    'name': 'US States',
    'format': 'geojson',
    'url': 'https://storage.googleapis.com/elastic-layer.appspot.com/L2FwcGhvc3RpbmdfcHJvZC9ibG9icy9BRW5CMlVvNGJ0aVNidFNJR2dEQl9rbTBjeXhKMU01WjRBeW1kN3JMXzM2Ry1qc3F6QjF4WE5XdHY2ODlnQkRpZFdCY2g1T2dqUGRHSFhSRTU3amlxTVFwZjNBSFhycEFwV2lYR29vTENjZjh1QTZaZnRpaHBzby5VXzZoNk1paGJYSkNPalpI?elastic_tile_service_tos=agree',
    'fields': [{ 'name': 'postal', 'description': 'Two letter abbreviation' }, {
      'name': 'name',
      'description': 'State name'
    }],
    'created_at': '2017-04-26T19:45:22.377820',
    'id': 5086441721823232
  }, {
    'attribution': 'Â© [Elastic Tile Service](https://www.elastic.co/elastic-maps-service)',
    'name': 'World Countries',
    'format': 'geojson',
    'url': 'https://storage.googleapis.com/elastic-layer.appspot.com/L2FwcGhvc3RpbmdfcHJvZC9ibG9icy9BRW5CMlVwWTZTWnhRRzNmUk9HUE93TENjLXNVd2IwdVNpc09SRXRyRzBVWWdqOU5qY2hldGJLOFNZSFpUMmZmZWdNZGx0NWprT1R1ZkZ0U1JEdFBtRnkwUWo0S0JuLTVYY1I5RFdSMVZ5alBIZkZuME1qVS04TS5oQTRNTl9yRUJCWk9tMk03?elastic_tile_service_tos=agree',
    'fields': [{ 'name': 'iso2', 'description': 'Two letter abbreviation' }, {
      'name': 'name',
      'description': 'Country name'
    }, { 'name': 'iso3', 'description': 'Three letter abbreviation' }],
    'created_at': '2017-04-26T17:12:15.978370',
    'id': 5659313586569216
  }]
};


describe('RegionMapsVisualizationTests', function () {

  let domNode;
  let expectCanvas;
  let RegionMapsVisualization;
  let Vis;
  let indexPattern;
  let vis;

  const _makeJsonAjaxCallOld = ChoroplethLayer.prototype._makeJsonAjaxCall;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject((Private, $injector) => {

    Vis = Private(visModule.VisProvider);
    RegionMapsVisualization = Private(RegionMapsVisualizationProvider);
    indexPattern = Private(LogstashIndexPatternStubProvider);

    ChoroplethLayer.prototype._makeJsonAjaxCall = async function () {
      //simulate network call
      return new Promise((resolve)=> {
        setTimeout(() => {
          resolve(worldJson);
        }, 10);
      });
    };

    const serviceSettings = $injector.get('serviceSettings');
    sinon.stub(serviceSettings, '_getManifest', function (url) {
      let contents = null;
      if (url.startsWith(tmsManifestUrl)) {
        contents = tmsManifest;
      } else if (url.startsWith(vectorManifestUrl)) {
        contents = vectorManifest;
      } else if (url.startsWith(manifestUrl)) {
        contents = manifest;
      }
      return {
        data: contents
      };
    });

    vis = new Vis(indexPattern, {
      type: 'region_map'
    });

    vis.params.selectedJoinField = { 'name': 'iso2', 'description': 'Two letter abbreviation' };
    vis.params.selectedLayer = {
      'attribution': '<p><a href="http://www.naturalearthdata.com/about/terms-of-use">Made with NaturalEarth</a> | <a href="https://www.elastic.co/elastic-maps-service">Elastic Maps Service</a></p>&#10;',
      'name': 'World Countries',
      'format': 'geojson',
      'url': 'https://staging-dot-elastic-layer.appspot.com/blob/5715999101812736?elastic_tile_service_tos=agree&my_app_version=7.0.0-alpha1',
      'fields': [{ 'name': 'iso2', 'description': 'Two letter abbreviation' }, {
        'name': 'iso3',
        'description': 'Three letter abbreviation'
      }, { 'name': 'name', 'description': 'Country name' }],
      'created_at': '2017-07-31T16:00:19.996450',
      'id': 5715999101812736,
      'layerId': 'elastic_maps_service.World Countries'
    };

  }));


  afterEach(function () {
    ChoroplethLayer.prototype._makeJsonAjaxCall = _makeJsonAjaxCallOld;
  });


  describe('RegionMapVisualization - basics', function () {

    beforeEach(async function () {
      setupDOM('512px', '512px');
    });

    afterEach(function () {
      teardownDOM();
    });


    it('should instantiate at zoom level 2', async function () {

      const regionMapVisualization = new RegionMapsVisualization(domNode, vis);
      const dummyTableGroup = {
        tables: [
          {
            columns: [{
              'aggConfig': {
                'id': '2',
                'enabled': true,
                'type': 'terms',
                'schema': 'segment',
                'params': { 'field': 'geo.dest', 'size': 5, 'order': 'desc', 'orderBy': '1' }
              }, 'title': 'geo.dest: Descending'
            }, {
              'aggConfig': { 'id': '1', 'enabled': true, 'type': 'count', 'schema': 'metric', 'params': {} },
              'title': 'Count'
            }],
            rows: [['CN', 26], ['IN', 17], ['US', 6], ['DE', 4], ['BR', 3]]
          }
        ]
      };

      await regionMapVisualization.render(dummyTableGroup, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false
      });
      const mismatchedPixels = await compareImage(initialPng);
      expect(mismatchedPixels < 16).to.equal(true);

    });
  });


  async function compareImage(expectedImage) {

    return new Promise((resolve) => {


      window.setTimeout(() => {
        const elementList = domNode.querySelectorAll('canvas');
        expect(elementList.length).to.equal(1);
        const actualCanvas = elementList[0];
        const actualContext = actualCanvas.getContext('2d');
        const actualImageData = actualContext.getImageData(0, 0, actualCanvas.width, actualCanvas.height);

        // convert expect PNG into pixel data by drawing in new canvas element
        expectCanvas.id = 'expectCursor';
        expectCanvas.width = actualCanvas.width;
        expectCanvas.height = actualCanvas.height;

        // const expectCtx = expectCanvas.getContext('2d');
        // expectCtx.drawImage(actualCanvas, 0, 0, actualCanvas.width, actualCanvas.height);
        const imageEl = new Image();
        imageEl.onload = () => {
          const expectCtx = expectCanvas.getContext('2d');
          expectCtx.drawImage(imageEl, 0, 0, actualCanvas.width, actualCanvas.height);  // draw reference image to size of generated image
          const expectImageData = expectCtx.getImageData(0, 0, actualCanvas.width, actualCanvas.height);
          // compare live map vs expected pixel data
          const diffImage = expectCtx.createImageData(actualCanvas.width, actualCanvas.height);
          const mismatchedPixels = pixelmatch(
            actualImageData.data,
            expectImageData.data,
            diffImage.data,
            actualCanvas.width,
            actualCanvas.height,
            { threshold: 0.1 });

            // Display difference image for refernce
          expectCtx.putImageData(diffImage, 0, 0);
          resolve(mismatchedPixels);
        };
        imageEl.src = expectedImage;
      });
    });
  }


  function setupDOM(width, height) {
    domNode = createDiv(width, height);
    document.body.appendChild(domNode);

    expectCanvas = document.createElement('canvas');
    document.body.appendChild(expectCanvas);
  }

  function teardownDOM() {
    domNode.innerHTML = '';
    document.body.removeChild(domNode);
    document.body.removeChild(expectCanvas);
  }

}
);


function createDiv(width, height) {
  const div = document.createElement('div');
  div.style.top = '0';
  div.style.left = '0';
  div.style.width = width;
  div.style.height = height;
  div.style.position = 'fixed';
  div.style.border = '1px solid red';
  div.style['pointer-events'] = 'none';
  return div;
}
