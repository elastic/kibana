import Promise from 'bluebird';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import $ from 'jquery';
import { VegaVisualizationProvider } from '../vega_visualization';
import LogstashIndexPatternStubProvider from 'fixtures/stubbed_logstash_index_pattern';
import * as visModule from 'ui/vis';
import { ImageComparator } from 'test_utils/image_comparator';

import vegaliteGraph from '!!raw-loader!./vegalite_graph.hjson';
import vegaliteImage256 from './vegalite_image_256.png';
import vegaliteImage512 from './vegalite_image_512.png';

import vegaGraph from '!!raw-loader!./vega_graph.hjson';
import vegaImage512 from './vega_image_512.png';

import vegaTooltipGraph from '!!raw-loader!./vega_tooltip_test.hjson';

import vegaMapGraph from '!!raw-loader!./vega_map_test.hjson';
import vegaMapImage256 from './vega_map_image_256.png';

import { VegaParser } from '../data_model/vega_parser';
import { SearchCache } from '../data_model/search_cache';

const THRESHOLD = 0.10;
const PIXEL_DIFF = 10;

describe('VegaVisualizations', () => {

  let domNode;
  let VegaVisualization;
  let Vis;
  let indexPattern;
  let vis;
  let imageComparator;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject((Private) => {

    Vis = Private(visModule.VisProvider);
    VegaVisualization = Private(VegaVisualizationProvider);
    indexPattern = Private(LogstashIndexPatternStubProvider);

  }));


  describe('VegaVisualization - basics', () => {

    beforeEach(async function () {
      setupDOM('512px', '512px');
      imageComparator = new ImageComparator();
      vis = new Vis(indexPattern, { type: 'vega' });
    });

    afterEach(function () {
      teardownDOM();
      imageComparator.destroy();
    });

    it('should show vegalite graph and update on resize', async function () {

      let vegaVis;
      try {
        vegaVis = new VegaVisualization(domNode, vis);
        const vegaParser = new VegaParser(vegaliteGraph, new SearchCache());
        await vegaParser.parseAsync();

        await vegaVis.render(vegaParser, { data: true });
        const mismatchedPixels1 = await compareImage(vegaliteImage512);
        expect(mismatchedPixels1).to.be.lessThan(PIXEL_DIFF);

        domNode.style.width = '256px';
        domNode.style.height = '256px';

        await vegaVis.render(vegaParser, { resize: true });
        const mismatchedPixels2 = await compareImage(vegaliteImage256);
        expect(mismatchedPixels2).to.be.lessThan(PIXEL_DIFF);

      } finally {
        vegaVis.destroy();
      }

    });

    it('should show vega graph', async function () {

      let vegaVis;
      try {

        vegaVis = new VegaVisualization(domNode, vis);
        const vegaParser = new VegaParser(vegaGraph, new SearchCache());
        await vegaParser.parseAsync();

        await vegaVis.render(vegaParser, { data: true });
        const mismatchedPixels = await compareImage(vegaImage512);
        expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);

      } finally {
        vegaVis.destroy();
      }

    });

    it('should show vegatooltip on mouseover over a vega graph', async () => {

      let vegaVis;
      try {

        vegaVis = new VegaVisualization(domNode, vis);
        const vegaParser = new VegaParser(vegaTooltipGraph, new SearchCache());
        await vegaParser.parseAsync();
        await vegaVis.render(vegaParser, { data: true });


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

        await Promise.delay(10);

        let tooltip = document.getElementById('vega-kibana-tooltip');
        expect(tooltip).to.be.ok();
        expect(tooltip.innerHTML).to.be(
          '<h2>This is a long title</h2>' +
          '<table><tbody>' +
          '<tr><td class="key">fieldA:</td><td class="value">value of fld1</td></tr>' +
          '<tr><td class="key">fld2:</td><td class="value">42</td></tr>' +
          '</tbody></table>');

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
        const vegaParser = new VegaParser(vegaMapGraph, new SearchCache());
        await vegaParser.parseAsync();

        domNode.style.width = '256px';
        domNode.style.height = '256px';

        await vegaVis.render(vegaParser, { data: true });
        const mismatchedPixels = await compareImage(vegaMapImage256);
        expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);

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
