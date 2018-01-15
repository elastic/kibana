import expect from 'expect.js';
import ngMock from 'ng_mock';
import _ from 'lodash';
import { RegionMapsVisualizationProvider } from '../region_map_visualization';
import ChoroplethLayer from '../choropleth_layer';
import LogstashIndexPatternStubProvider from 'fixtures/stubbed_logstash_index_pattern';
import * as visModule from 'ui/vis';
import { ImageComparator } from 'test_utils/image_comparator';
import sinon from 'sinon';
import worldJson from './world.json';

import initialPng from './initial.png';
import toiso3Png from './toiso3.png';
import afterresizePng from './afterresize.png';
import afterdatachangePng from './afterdatachange.png';
import afterdatachangeandresizePng from './afterdatachangeandresize.png';
import aftercolorchangePng from './aftercolorchange.png';
import changestartupPng from './changestartup.png';

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


const THRESHOLD = 0.45;
const PIXEL_DIFF = 64;

describe('RegionMapsVisualizationTests', function () {

  let domNode;
  let RegionMapsVisualization;
  let Vis;
  let indexPattern;
  let vis;

  let imageComparator;

  const _makeJsonAjaxCallOld = ChoroplethLayer.prototype._makeJsonAjaxCall;

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



  }));


  afterEach(function () {
    ChoroplethLayer.prototype._makeJsonAjaxCall = _makeJsonAjaxCallOld;
  });


  describe('RegionMapVisualization - basics', function () {

    beforeEach(async function () {
      setupDOM('512px', '512px');

      imageComparator = new ImageComparator();


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
    });

    afterEach(function () {
      teardownDOM();
      imageComparator.destroy();
    });


    it('should instantiate at zoom level 2', async function () {
      const regionMapsVisualization = new RegionMapsVisualization(domNode, vis);
      await regionMapsVisualization.render(dummyTableGroup, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false
      });
      const mismatchedPixels = await compareImage(initialPng);
      regionMapsVisualization.destroy();
      expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);
    });

    it('should update after resetting join field', async function () {
      const regionMapsVisualization = new RegionMapsVisualization(domNode, vis);
      await regionMapsVisualization.render(dummyTableGroup, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false
      });

      //this will actually create an empty image
      vis.params.selectedJoinField = { 'name': 'iso3', 'description': 'Three letter abbreviation' };
      vis.params.isDisplayWarning = false;//so we don't get notifications
      await regionMapsVisualization.render(dummyTableGroup, {
        resize: false,
        params: true,
        aggs: false,
        data: false,
        uiState: false
      });

      const mismatchedPixels = await compareImage(toiso3Png);
      regionMapsVisualization.destroy();
      expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);

    });

    it('should resize', async function () {

      const regionMapsVisualization = new RegionMapsVisualization(domNode, vis);
      await regionMapsVisualization.render(dummyTableGroup, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false
      });

      domNode.style.width = '256px';
      domNode.style.height = '128px';
      await regionMapsVisualization.render(dummyTableGroup, {
        resize: true,
        params: false,
        aggs: false,
        data: false,
        uiState: false
      });
      const mismatchedPixelsAfterFirstResize = await compareImage(afterresizePng);

      domNode.style.width = '512px';
      domNode.style.height = '512px';
      await regionMapsVisualization.render(dummyTableGroup, {
        resize: true,
        params: false,
        aggs: false,
        data: false,
        uiState: false
      });
      const mismatchedPixelsAfterSecondResize = await compareImage(initialPng);

      regionMapsVisualization.destroy();
      expect(mismatchedPixelsAfterFirstResize).to.be.lessThan(PIXEL_DIFF);
      expect(mismatchedPixelsAfterSecondResize).to.be.lessThan(PIXEL_DIFF);
    });

    it('should redo data', async function () {

      const regionMapsVisualization = new RegionMapsVisualization(domNode, vis);
      await regionMapsVisualization.render(dummyTableGroup, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false
      });

      const newTableGroup = _.cloneDeep(dummyTableGroup);
      newTableGroup.tables[0].rows.pop();//remove one shape

      await regionMapsVisualization.render(newTableGroup, {
        resize: false,
        params: false,
        aggs: false,
        data: true,
        uiState: false
      });
      const mismatchedPixelsAfterDataChange = await compareImage(afterdatachangePng);


      const anoterTableGroup = _.cloneDeep(newTableGroup);
      anoterTableGroup.tables[0].rows.pop();//remove one shape
      domNode.style.width = '412px';
      domNode.style.height = '112px';
      await regionMapsVisualization.render(anoterTableGroup, {
        resize: true,
        params: false,
        aggs: false,
        data: true,
        uiState: false
      });
      const mismatchedPixelsAfterDataChangeAndResize = await compareImage(afterdatachangeandresizePng);

      regionMapsVisualization.destroy();
      expect(mismatchedPixelsAfterDataChange).to.be.lessThan(PIXEL_DIFF);
      expect(mismatchedPixelsAfterDataChangeAndResize).to.be.lessThan(PIXEL_DIFF);

    });

    it('should redo data and color ramp', async function () {

      const regionMapsVisualization = new RegionMapsVisualization(domNode, vis);
      await regionMapsVisualization.render(dummyTableGroup, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false
      });

      const newTableGroup = _.cloneDeep(dummyTableGroup);
      newTableGroup.tables[0].rows.pop();//remove one shape
      vis.params.colorSchema = 'Blues';
      await regionMapsVisualization.render(newTableGroup, {
        resize: false,
        params: true,
        aggs: false,
        data: true,
        uiState: false
      });
      const mismatchedPixelsAfterDataAndColorChange = await compareImage(aftercolorchangePng);

      regionMapsVisualization.destroy();
      expect(mismatchedPixelsAfterDataAndColorChange).to.be.lessThan(PIXEL_DIFF);

    });


    it('should zoom and center elsewhere', async function () {

      vis.params.mapZoom = 4;
      vis.params.mapCenter = [36, -85];
      const regionMapsVisualization = new RegionMapsVisualization(domNode, vis);
      await regionMapsVisualization.render(dummyTableGroup, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false
      });

      const mismatchedPixels = await compareImage(changestartupPng);
      regionMapsVisualization.destroy();

      expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);

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

