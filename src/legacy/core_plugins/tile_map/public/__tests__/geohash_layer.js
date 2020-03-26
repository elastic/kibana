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
import { KibanaMap } from 'ui/vis/map/kibana_map';
import { GeohashLayer } from '../geohash_layer';
// import heatmapPng from './heatmap.png';
import scaledCircleMarkersPng from './scaledCircleMarkers.png';
// import shadedCircleMarkersPng from './shadedCircleMarkers.png';
import { ImageComparator } from 'test_utils/image_comparator';
import GeoHashSampleData from './dummy_es_response.json';

describe('geohash_layer', function() {
  let domNode;
  let expectCanvas;
  let kibanaMap;
  let imageComparator;

  function setupDOM() {
    domNode = document.createElement('div');
    domNode.style.top = '0';
    domNode.style.left = '0';
    domNode.style.width = '512px';
    domNode.style.height = '512px';
    domNode.style.position = 'fixed';
    domNode.style['pointer-events'] = 'none';
    document.body.appendChild(domNode);

    expectCanvas = document.createElement('canvas');
    document.body.appendChild(expectCanvas);
  }

  function teardownDOM() {
    domNode.innerHTML = '';
    document.body.removeChild(domNode);
    document.body.removeChild(expectCanvas);
  }

  describe('GeohashGridLayer', function() {
    beforeEach(async function() {
      setupDOM();
      imageComparator = new ImageComparator();
      kibanaMap = new KibanaMap(domNode, {
        minZoom: 1,
        maxZoom: 10,
      });
      kibanaMap.setZoomLevel(3);
      kibanaMap.setCenter({
        lon: -100,
        lat: 40,
      });
    });

    afterEach(function() {
      // return;
      kibanaMap.destroy();
      teardownDOM();
      imageComparator.destroy();
    });

    [
      {
        options: { mapType: 'Scaled Circle Markers', colorRamp: 'Yellow to Red' },
        expected: scaledCircleMarkersPng,
      },
      // https://github.com/elastic/kibana/issues/19393
      // {
      //   options: { mapType: 'Shaded Circle Markers', colorRamp: 'Yellow to Red' },
      //   expected: shadedCircleMarkersPng
      // },
      // FAILING: https://github.com/elastic/kibana/issues/33323
      // {
      //   options: {
      //     mapType: 'Heatmap',
      //     heatmap: {
      //       heatClusterSize: '2'
      //     }
      //   },
      //   expected: heatmapPng
      // }
    ].forEach(function(test) {
      it(`${test.options.mapType} (may fail in dev env)`, async function() {
        const geohashGridOptions = test.options;
        const geohashLayer = new GeohashLayer(
          GeoHashSampleData.featureCollection,
          GeoHashSampleData.meta,
          geohashGridOptions,
          kibanaMap.getZoomLevel(),
          kibanaMap
        );
        kibanaMap.addLayer(geohashLayer);

        const elementList = domNode.querySelectorAll('canvas');
        expect(elementList.length).to.equal(1);
        const canvas = elementList[0];

        const mismatchedPixels = await imageComparator.compareImage(canvas, test.expected, 0.1);
        expect(mismatchedPixels).to.be.lessThan(16);
      });
    });

    it('should not throw when fitting on empty-data layer', function() {
      const geohashLayer = new GeohashLayer(
        {
          type: 'FeatureCollection',
          features: [],
        },
        {},
        { mapType: 'Scaled Circle Markers', colorRamp: 'Yellow to Red' },
        kibanaMap.getZoomLevel(),
        kibanaMap
      );
      kibanaMap.addLayer(geohashLayer);

      expect(() => {
        kibanaMap.fitToData();
      }).to.not.throwException();
    });

    it('should not throw when resizing to 0 on heatmap', function() {
      const geohashGridOptions = {
        mapType: 'Heatmap',
        heatmap: {
          heatClusterSize: '2',
        },
      };

      const geohashLayer = new GeohashLayer(
        GeoHashSampleData.featureCollection,
        GeoHashSampleData.meta,
        geohashGridOptions,
        kibanaMap.getZoomLevel(),
        kibanaMap
      );
      kibanaMap.addLayer(geohashLayer);
      domNode.style.width = 0;
      domNode.style.height = 0;
      expect(() => {
        kibanaMap.resize();
      }).to.not.throwException();
    });
  });
});
