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

        console.log(scaledCircleMarkersPng);

        // TODO get pixel data from stored base64 image!
        /*const simplePng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAIAAAACDbGyAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9oMCRUiMrIBQVkAAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAADElEQVQI12NgoC4AAABQAAEiE+h1AAAAAElFTkSuQmCC";
        let image = new Image();
        image.onLoad = () => {
          ctx2.drawImage(this, 0, 0);
        }
        // image.src = simplePng;
        image.setAttribute("src", simplePng);
        document.body.appendChild(image);
        ctx2.drawImage(image, 0, 0);
        //
        //document.write(`<img src=${simplePng}/>`);

        //image.src = 'https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png';

        // image.src = scaledCircleMarkersPng;*/

        ctx2.putImageData(imageData, 0, 0);
        // ctx2.putImageData(imageData, 500, 500);
        const imageData2 = ctx2.getImageData(0, 0, 1228, 1228);

        const diffImage = ctx.createImageData(1228, 1228);
        const mismatchedPixels = pixelmatch(imageData.data, imageData2.data, diffImage.data, 1228, 1228, { threshold: 0.1 });
        console.log('mismatchedPixels', mismatchedPixels);
        //expect(mismatchedPixels).to.equal(0);

        ctx2.putImageData(diffImage, 0, 0);

        /*const image = canvas.toDataURL('png');
        const base64Only = image.substring(22);
        const unencoded = window.atob(base64Only);

        let diffImage;
        const mismatchedPixels = pixelmatch(scaledCircleMarkersPng, unencoded, diffImage, 1228, 1228, {threshold: 0.1});
        console.log("mismatchedPixels", mismatchedPixels);
        expect(mismatchedPixels).to.equal(0);

        const base64Only = image.substring(22);
        const unencoded = window.atob(base64Only);
        console.log(unencoded);
        const decoded = window.btoa(diffImage);
        document.write(`<img src=data:image/png;base64,${decoded}/>`);*/
        //window.location = image;
        done();

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
