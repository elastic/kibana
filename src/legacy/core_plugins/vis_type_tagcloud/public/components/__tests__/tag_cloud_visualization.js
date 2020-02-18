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
import ngMock from 'ng_mock';
import LogstashIndexPatternStubProvider from 'fixtures/stubbed_logstash_index_pattern';
import { start as visualizationsStart } from '../../../../../core_plugins/visualizations/public/np_ready/public/legacy';
import { ImageComparator } from 'test_utils/image_comparator';
import { createTagCloudVisualization } from '../tag_cloud_visualization';
import basicdrawPng from './basicdraw.png';
import afterresizePng from './afterresize.png';
import afterparamChange from './afterparamchange.png';

// Replace with mock when converting to jest tests
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { seedColors } from '../../../../../../plugins/charts/public/services/colors/seed_colors';

const THRESHOLD = 0.65;
const PIXEL_DIFF = 64;

describe('TagCloudVisualizationTest', function() {
  let domNode;
  let indexPattern;
  let vis;
  let imageComparator;

  const dummyTableGroup = {
    columns: [
      {
        id: 'col-0',
        title: 'geo.dest: Descending',
      },
      {
        id: 'col-1',
        title: 'Count',
      },
    ],
    rows: [
      { 'col-0': 'CN', 'col-1': 26 },
      { 'col-0': 'IN', 'col-1': 17 },
      { 'col-0': 'US', 'col-1': 6 },
      { 'col-0': 'DE', 'col-1': 4 },
      { 'col-0': 'BR', 'col-1': 3 },
    ],
  };
  const TagCloudVisualization = createTagCloudVisualization({
    colors: {
      seedColors,
    },
  });

  beforeEach(ngMock.module('kibana'));
  beforeEach(
    ngMock.inject(Private => {
      indexPattern = Private(LogstashIndexPatternStubProvider);
    })
  );

  describe('TagCloudVisualization - basics', function() {
    beforeEach(async function() {
      setupDOM('512px', '512px');
      imageComparator = new ImageComparator();
      vis = new visualizationsStart.Vis(indexPattern, {
        type: 'tagcloud',
        params: {
          bucket: { accessor: 0, format: {} },
          metric: { accessor: 0, format: {} },
        },
      });
    });

    afterEach(function() {
      teardownDOM();
      imageComparator.destroy();
    });

    it('simple draw', async function() {
      const tagcloudVisualization = new TagCloudVisualization(domNode, vis);

      await tagcloudVisualization.render(dummyTableGroup, vis.params, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false,
      });

      const svgNode = domNode.querySelector('svg');
      const mismatchedPixels = await imageComparator.compareDOMContents(
        svgNode.outerHTML,
        512,
        512,
        basicdrawPng,
        THRESHOLD
      );
      expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);
    });

    it('with resize', async function() {
      const tagcloudVisualization = new TagCloudVisualization(domNode, vis);
      await tagcloudVisualization.render(dummyTableGroup, vis.params, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false,
      });

      domNode.style.width = '256px';
      domNode.style.height = '368px';
      await tagcloudVisualization.render(dummyTableGroup, vis.params, {
        resize: true,
        params: false,
        aggs: false,
        data: false,
        uiState: false,
      });

      const svgNode = domNode.querySelector('svg');
      const mismatchedPixels = await imageComparator.compareDOMContents(
        svgNode.outerHTML,
        256,
        368,
        afterresizePng,
        THRESHOLD
      );
      expect(mismatchedPixels).to.be.lessThan(PIXEL_DIFF);
    });

    it('with param change', async function() {
      const tagcloudVisualization = new TagCloudVisualization(domNode, vis);
      await tagcloudVisualization.render(dummyTableGroup, vis.params, {
        resize: false,
        params: true,
        aggs: true,
        data: true,
        uiState: false,
      });

      domNode.style.width = '256px';
      domNode.style.height = '368px';
      vis.params.orientation = 'right angled';
      vis.params.minFontSize = 70;
      await tagcloudVisualization.render(dummyTableGroup, vis.params, {
        resize: true,
        params: true,
        aggs: false,
        data: false,
        uiState: false,
      });

      const svgNode = domNode.querySelector('svg');
      const mismatchedPixels = await imageComparator.compareDOMContents(
        svgNode.outerHTML,
        256,
        368,
        afterparamChange,
        THRESHOLD
      );
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
