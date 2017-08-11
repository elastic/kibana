import expect from 'expect.js';
import pixelmatch from 'pixelmatch';
import { KibanaMap } from '../kibana_map';
import { GeohashLayer } from '../geohash_layer';
import { GeoHashSampleData } from './geohash_sample_data';
import scaledCircleMarkersPng from './scaledCircleMarkers.png';

describe('kibana_map tests', function () {

  let domNode;
  let kibanaMap;

  function setupDOM() {
    domNode = document.createElement('div');
    domNode.style.top = '0';
    domNode.style.left = '0';
    domNode.style.width = '512px';
    domNode.style.height = '512px';
    domNode.style.position = 'fixed';
    domNode.style['pointer-events'] = 'none';
    document.body.appendChild(domNode);
  }

  function teardownDOM() {
    domNode.innerHTML = '';
    document.body.removeChild(domNode);
  }

  describe('GeohashGridLayer', function () {

    beforeEach(async function () {
      setupDOM();
      kibanaMap = new KibanaMap(domNode, {
        minZoom: 1,
        maxZoom: 10
      });
      kibanaMap.setZoomLevel(3);
      kibanaMap.setCenter({
        lon: -100,
        lat: 40
      });
    });

    afterEach(function () {
      kibanaMap.destroy();
      teardownDOM();
    });

    /*[
      {
        options:  { 'mapType': 'Scaled Circle Markers' },
        expected: ``
      },
      {
        options: { 'mapType': 'Shaded Circle Markers' },
        expected: ``
      },
      {
        options: { 'mapType': 'Shaded Geohash Grid' },
        expected: ``
      }
    ]*/
    [
      {
        options:  { 'mapType': 'Scaled Circle Markers' },
        expected: ``
      }
    ].forEach(function (test) {

      it(test.options.mapType, function (done) {

      	const geohashGridOptions = test.options;
	      const geohashLayer = new GeohashLayer(GeoHashSampleData, geohashGridOptions, kibanaMap.getZoomLevel(), kibanaMap);
	      kibanaMap.addLayer(geohashLayer);

	      // Give time for canvas to render before checking output
      	window.setTimeout(() => {
        const elementList = domNode.querySelectorAll('canvas');
        expect(elementList.length).to.equal(1);
        const canvas = elementList[0];

        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, 1228, 1228);


        const canvas2 = document.createElement('canvas');
        canvas2.id     = 'CursorLayer';
        canvas2.width  = 1228;
        canvas2.height = 1228;

        document.body.appendChild(canvas2);

        const ctx2 = canvas2.getContext('2d');

        let image = new Image();
        image.onload = () => {
          console.log("onLoad called");
          ctx2.drawImage(image, 0, 0);

          const imageData2 = ctx2.getImageData(0, 0, 1228, 1228);

          let diffImage = ctx.createImageData(1228, 1228);
          const mismatchedPixels = pixelmatch(imageData.data, imageData2.data, diffImage.data, 1228, 1228, {threshold: 0.1});
          console.log("mismatchedPixels", mismatchedPixels);
          //expect(mismatchedPixels).to.equal(0);

          ctx2.putImageData(diffImage, 0, 0);

          done();
        }
        image.src = scaledCircleMarkersPng;

       	}, 200);
      });
    });


    it('should not throw when fitting on empty-data layer', function () {

      const geohashLayer = new GeohashLayer({
        type: 'FeatureCollection',
        features: []
      }, { 'mapType': 'Scaled Circle Markers' }, kibanaMap.getZoomLevel(), kibanaMap);
      kibanaMap.addLayer(geohashLayer);

      expect(() => {
        kibanaMap.fitToData();
      }).to.not.throwException();
    });


  });

});
