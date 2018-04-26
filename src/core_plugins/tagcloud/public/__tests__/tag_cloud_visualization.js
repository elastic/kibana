import expect from 'expect.js';
import ngMock from 'ng_mock';
import LogstashIndexPatternStubProvider from 'fixtures/stubbed_logstash_index_pattern';
import * as visModule from 'ui/vis';
import { ImageComparator } from 'test_utils/image_comparator';
import { TagCloudVisualization } from '../tag_cloud_visualization';
import basicdrawPng from './basicdraw.png';
import afterresizePng from './afterresize.png';
import afterparamChange from './afterparamchange.png';

const THRESHOLD = 0.65;
const PIXEL_DIFF = 64;

describe('TagCloudVisualizationTest', function () {

  let domNode;
  let Vis;
  let indexPattern;
  let vis;
  let imageComparator;

  const dummyTableGroup = {
    tables: [
      {
        columns: [{
          'aggConfig': {
            'id': '2',
            'enabled': true,
            'type': 'terms',
            'schema': 'segment',
            'params': { 'field': 'geo.dest', 'size': 5, 'order': 'desc', 'orderBy': '1' },
            fieldFormatter: () => (x => x)
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
  beforeEach(ngMock.inject((Private) => {
    Vis = Private(visModule.VisProvider);
    indexPattern = Private(LogstashIndexPatternStubProvider);
  }));


  describe('TagCloudVisualization - basics', function () {

    beforeEach(async function () {
      setupDOM('512px', '512px');
      imageComparator = new ImageComparator();
      vis = new Vis(indexPattern, {
        type: 'tagcloud'
      });

    });

    afterEach(function () {
      teardownDOM();
      imageComparator.destroy();
    });

    it('simple draw', async function () {
      const tagcloudVisualization = new TagCloudVisualization(domNode, vis);

      await tagcloudVisualization.render(dummyTableGroup, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false
      });

      const svgNode = domNode.querySelector('svg');
      const mismatchedPixels = await imageComparator.compareDOMContents(svgNode.outerHTML, 512, 512, basicdrawPng, THRESHOLD);
      expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);
    });

    it('with resize', async function () {

      const tagcloudVisualization = new TagCloudVisualization(domNode, vis);
      await tagcloudVisualization.render(dummyTableGroup, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false
      });

      domNode.style.width = '256px';
      domNode.style.height = '368px';
      await tagcloudVisualization.render(dummyTableGroup, {
        resize: true,
        params: false,
        aggs: false,
        data: false,
        uiState: false
      });

      const svgNode = domNode.querySelector('svg');
      const mismatchedPixels = await imageComparator.compareDOMContents(svgNode.outerHTML, 256, 368, afterresizePng, THRESHOLD);
      expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);
    });

    it('with param change', async function () {

      const tagcloudVisualization = new TagCloudVisualization(domNode, vis);
      await tagcloudVisualization.render(dummyTableGroup, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false
      });

      domNode.style.width = '256px';
      domNode.style.height = '368px';
      vis.params.orientation = 'right angled';
      vis.params.minFontSize = 70;
      await tagcloudVisualization.render(dummyTableGroup, {
        resize: true,
        params: true,
        aggs: false,
        data: false,
        uiState: false
      });

      const svgNode = domNode.querySelector('svg');
      const mismatchedPixels = await imageComparator.compareDOMContents(svgNode.outerHTML, 256, 368, afterparamChange, THRESHOLD);
      expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);
    });


  });


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

