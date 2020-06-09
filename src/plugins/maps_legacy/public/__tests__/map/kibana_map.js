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

import expect from '@kbn/expect';
import { KibanaMap } from '../../map/kibana_map';
import { KibanaMapLayer } from '../../map/kibana_map_layer';

describe('kibana_map tests', function () {
  let domNode;
  let kibanaMap;

  function createDiv(width, height) {
    const div = document.createElement('div');
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = width;
    div.style.height = height;
    div.style.position = 'fixed';
    div.style['pointer-events'] = 'none';
    return div;
  }

  function setupDOM(width, height) {
    domNode = createDiv(width, height);
    document.body.appendChild(domNode);
  }

  function teardownDOM() {
    domNode.innerHTML = '';
    document.body.removeChild(domNode);
  }

  describe('KibanaMap - basics', function () {
    beforeEach(async function () {
      setupDOM('512px', '512px');
      kibanaMap = new KibanaMap(domNode, {
        minZoom: 1,
        maxZoom: 10,
        center: [0, 0],
        zoom: 0,
      });
    });

    afterEach(function () {
      kibanaMap.destroy();
      teardownDOM();
    });

    it('should instantiate at zoom level 2', function () {
      const bounds = kibanaMap.getBounds();
      expect(bounds.bottom_right.lon).to.equal(90);
      expect(bounds.top_left.lon).to.equal(-90);
      expect(kibanaMap.getCenter().lon).to.equal(0);
      expect(kibanaMap.getCenter().lat).to.equal(0);
      expect(kibanaMap.getZoomLevel()).to.equal(2);
    });

    it('should resize to fit container', function () {
      kibanaMap.setZoomLevel(2);
      expect(kibanaMap.getCenter().lon).to.equal(0);
      expect(kibanaMap.getCenter().lat).to.equal(0);

      domNode.style.width = '1024px';
      domNode.style.height = '1024px';
      kibanaMap.resize();

      expect(kibanaMap.getCenter().lon).to.equal(0);
      expect(kibanaMap.getCenter().lat).to.equal(0);
    });
  });

  describe('getBounds', function () {
    afterEach(function () {
      kibanaMap.destroy();
      teardownDOM();
    });

    describe('extended bounds', function () {
      beforeEach(async function () {
        setupDOM('1600px', '1024px');
        kibanaMap = new KibanaMap(domNode, {
          minZoom: 1,
          maxZoom: 10,
          center: [0, 0],
          zoom: 2,
        });
      });

      it('should get untrimmed map bounds', function () {
        const bounds = kibanaMap.getBounds();
        expect(bounds.bottom_right.lon.toFixed(2)).to.equal('281.25');
        expect(bounds.top_left.lon.toFixed(2)).to.equal('-281.25');
      });
    });

    describe('no map height (should default to size of 1px for height)', function () {
      beforeEach(async function () {
        setupDOM('386px', '256px');
        const noHeightNode = createDiv('386px', '0px');
        domNode.appendChild(noHeightNode);
        kibanaMap = new KibanaMap(noHeightNode, {
          minZoom: 1,
          maxZoom: 10,
          center: [0, 0],
          zoom: 10,
        });
      });

      it('should calculate map dimensions based on enforcement of single pixel min-width CSS-rule', function () {
        const bounds = kibanaMap.getBounds();
        expect(bounds).to.have.property('bottom_right');
        expect(round(bounds.bottom_right.lon, 2)).to.equal(0.27);
        expect(round(bounds.bottom_right.lat, 2)).to.equal(0);
        expect(bounds).to.have.property('top_left');
        expect(round(bounds.top_left.lon, 2)).to.equal(-0.27);
        expect(round(bounds.top_left.lat, 2)).to.equal(0);
      });

      function round(num, dig) {
        return Math.round(num * Math.pow(10, dig)) / Math.pow(10, dig);
      }
    });

    describe('no map width (should default to size of 1px for width)', function () {
      beforeEach(async function () {
        setupDOM('386px', '256px');
        const noWidthNode = createDiv('0px', '256px');
        domNode.appendChild(noWidthNode);
        kibanaMap = new KibanaMap(noWidthNode, {
          minZoom: 1,
          maxZoom: 10,
          center: [0, 0],
          zoom: 10,
        });
      });

      it('should calculate map dimensions based on enforcement of single pixel min-width CSS-rule', function () {
        const bounds = kibanaMap.getBounds();
        expect(bounds).to.have.property('bottom_right');
        expect(Math.round(bounds.bottom_right.lon)).to.equal(0);
        expect(bounds.bottom_right.lat.toFixed(2)).to.equal('-0.18');
        expect(bounds).to.have.property('top_left');
        expect(Math.round(bounds.top_left.lon)).to.equal(0);
        expect(bounds.top_left.lat.toFixed(2)).to.equal('0.18');
      });
    });

    describe('wrapping', function () {
      beforeEach(async function () {
        setupDOM('1600px', '1024px');
        kibanaMap = new KibanaMap(domNode, {
          minZoom: 1,
          maxZoom: 10,
          center: [0, -800], //swing the map over two earth-rotations west
          zoom: 2,
        });
      });

      it('coordinates should be corrected to  center the -180,180 range', function () {
        const bounds = kibanaMap.getBounds();
        expect(bounds.bottom_right.lon.toFixed(2)).to.equal('201.09');
        expect(bounds.top_left.lon.toFixed(2)).to.equal('-361.41');
      });
    });

    describe('wrapping - zoomed in', function () {
      beforeEach(async function () {
        setupDOM('1600px', '1024px');
        kibanaMap = new KibanaMap(domNode, {
          minZoom: 1,
          maxZoom: 10,
          center: [0, -800], //swing the map over two earth-rotations west
          zoom: 8,
        });
      });

      it('coordinates should be corrected to fall within the -180,180 range', function () {
        const bounds = kibanaMap.getBounds();
        expect(bounds.bottom_right.lon.toFixed(2)).to.equal('-75.61');
        expect(bounds.top_left.lon.toFixed(2)).to.equal('-84.40');
      });
    });
  });

  describe('KibanaMap - attributions', function () {
    beforeEach(async function () {
      setupDOM('512px', '512px');
      kibanaMap = new KibanaMap(domNode, {
        minZoom: 1,
        maxZoom: 10,
        center: [0, 0],
        zoom: 0,
      });
    });

    afterEach(function () {
      kibanaMap.destroy();
      teardownDOM();
    });

    function makeMockLayer(attribution) {
      const layer = new KibanaMapLayer();
      layer._attribution = attribution;
      // eslint-disable-next-line no-undef
      layer._leafletLayer = L.geoJson(null);
      return layer;
    }

    it('should update attributions correctly', function () {
      kibanaMap.addLayer(makeMockLayer('foo|bar'));
      expect(domNode.querySelectorAll('.leaflet-control-attribution')[0].innerHTML).to.equal(
        'foo, bar'
      );

      kibanaMap.addLayer(makeMockLayer('bar'));
      expect(domNode.querySelectorAll('.leaflet-control-attribution')[0].innerHTML).to.equal(
        'foo, bar'
      );

      const layer = makeMockLayer('bar,stool');
      kibanaMap.addLayer(layer);
      expect(domNode.querySelectorAll('.leaflet-control-attribution')[0].innerHTML).to.equal(
        'foo, bar, stool'
      );

      kibanaMap.removeLayer(layer);
      expect(domNode.querySelectorAll('.leaflet-control-attribution')[0].innerHTML).to.equal(
        'foo, bar'
      );
    });
  });

  describe('KibanaMap - baseLayer', function () {
    beforeEach(async function () {
      setupDOM('512px', '512px');
      kibanaMap = new KibanaMap(domNode, {
        minZoom: 1,
        maxZoom: 10,
        center: [0, 0],
        zoom: 0,
      });
    });

    afterEach(function () {
      kibanaMap.destroy();
      teardownDOM();
    });

    it('TMS', async function () {
      const options = {
        url:
          'https://tiles-stage.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=kibana',
        minZoom: 0,
        maxZoom: 12,
        attribution: '© [Elastic Maps Service](https://www.elastic.co/elastic-maps-service)',
      };

      return new Promise(function (resolve) {
        kibanaMap.on('baseLayer:loaded', () => {
          resolve();
        });
        kibanaMap.setBaseLayer({
          baseLayerType: 'tms',
          options: options,
        });
      });
    });

    it('WMS - should handle empty settings', async function () {
      const invalidOptions = {
        url: undefined,
        version: undefined,
        layers: undefined,
        format: 'image/png',
        transparent: true,
        attribution: undefined,
        styles: '',
        minZoom: 1,
        maxZoom: 18,
      };

      kibanaMap.setBaseLayer({
        baseLayerType: 'wms',
        options: invalidOptions,
      });

      expect(kibanaMap.getLeafletBaseLayer()).to.eql(null);
    });

    it('WMS - should clean attribution', async function () {
      const options = {
        url: 'https://basemap.nationalmap.gov/arcgis/services/USGSTopo/MapServer/WMSServer',
        version: '1.1.0',
        layers: '0',
        format: 'image/png',
        transparent: true,
        attribution: '<div>foobar</div>',
        styles: '',
        minZoom: 1,
        maxZoom: 18,
      };

      kibanaMap.setBaseLayer({
        baseLayerType: 'wms',
        options: options,
      });

      expect(domNode.querySelectorAll('.leaflet-control-attribution')[0].innerHTML).to.equal(
        '&lt;div&gt;foobar&lt;/div&gt;'
      );
    });
  });
});
