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

import d3 from 'd3';
import expect from '@kbn/expect';
import $ from 'jquery';

// Data
import series from '../../../../../../../../plugins/vis_type_vislib/public/fixtures/mock_data/date_histogram/_series';
import columns from '../../../../../../../../plugins/vis_type_vislib/public/fixtures/mock_data/date_histogram/_columns';
import rows from '../../../../../../../../plugins/vis_type_vislib/public/fixtures/mock_data/date_histogram/_rows';
import stackedSeries from '../../../../../../../../plugins/vis_type_vislib/public/fixtures/mock_data/date_histogram/_stacked_series';
import { getMockUiState } from '../../../../../../../../plugins/vis_type_vislib/public/fixtures/mocks';
import { Layout } from '../../../../../../../../plugins/vis_type_vislib/public/vislib/lib/layout/layout';
import { VisConfig } from '../../../../../../../../plugins/vis_type_vislib/public/vislib/lib/vis_config';
import { getVis } from '../../_vis_fixture';

const dateHistogramArray = [series, columns, rows, stackedSeries];
const names = ['series', 'columns', 'rows', 'stackedSeries'];

dateHistogramArray.forEach(function(data, i) {
  describe('Vislib Layout Class Test Suite for ' + names[i] + ' Data', function() {
    let vis;
    let mockUiState;
    let numberOfCharts;
    let testLayout;

    beforeEach(() => {
      vis = getVis();
      mockUiState = getMockUiState();
      vis.render(data, mockUiState);
      numberOfCharts = vis.handler.charts.length;
    });

    afterEach(() => {
      vis.destroy();
    });

    describe('createLayout Method', function() {
      it('should append all the divs', function() {
        expect($(vis.element).find('.visWrapper').length).to.be(1);
        expect($(vis.element).find('.visAxis--y').length).to.be(2);
        expect($(vis.element).find('.visWrapper__column').length).to.be(1);
        expect($(vis.element).find('.visAxis__column--y').length).to.be(2);
        expect($(vis.element).find('.y-axis-title').length).to.be.above(0);
        expect($(vis.element).find('.visAxis__splitAxes--y').length).to.be(2);
        expect($(vis.element).find('.visAxis__spacer--y').length).to.be(4);
        expect($(vis.element).find('.visWrapper__chart').length).to.be(numberOfCharts);
        expect($(vis.element).find('.visAxis--x').length).to.be(2);
        expect($(vis.element).find('.visAxis__splitAxes--x').length).to.be(2);
        expect($(vis.element).find('.x-axis-title').length).to.be.above(0);
      });
    });

    describe('layout Method', function() {
      beforeEach(function() {
        const visConfig = new VisConfig(
          {
            type: 'histogram',
          },
          data,
          mockUiState,
          vis.element,
          () => undefined
        );
        testLayout = new Layout(visConfig);
      });

      it('should append a div with the correct class name', function() {
        expect($(vis.element).find('.chart').length).to.be(numberOfCharts);
      });

      it('should bind data to the DOM element', function() {
        expect(
          !!$(vis.element)
            .find('.chart')
            .data()
        ).to.be(true);
      });

      it('should create children', function() {
        expect(typeof $(vis.element).find('.x-axis-div')).to.be('object');
      });

      it('should call split function when provided', function() {
        expect(typeof $(vis.element).find('.x-axis-div')).to.be('object');
      });

      it('should throw errors when incorrect arguments provided', function() {
        expect(function() {
          testLayout.layout({
            parent: vis.element,
            type: undefined,
            class: 'chart',
          });
        }).to.throwError();

        expect(function() {
          testLayout.layout({
            type: 'div',
            class: 'chart',
          });
        }).to.throwError();

        expect(function() {
          testLayout.layout({
            parent: 'histogram',
            type: 'div',
          });
        }).to.throwError();

        expect(function() {
          testLayout.layout({
            parent: vis.element,
            type: function(d) {
              return d;
            },
            class: 'chart',
          });
        }).to.throwError();
      });
    });

    describe('appendElem Method', function() {
      beforeEach(function() {
        vis.handler.layout.appendElem(vis.element, 'svg', 'column');
        vis.handler.layout.appendElem('.visChart', 'div', 'test');
      });

      it('should append DOM element to el with a class name', function() {
        expect(typeof $(vis.element).find('.column')).to.be('object');
        expect(typeof $(vis.element).find('.test')).to.be('object');
      });
    });

    describe('removeAll Method', function() {
      beforeEach(function() {
        d3.select(vis.element)
          .append('div')
          .attr('class', 'visualize');
        vis.handler.layout.removeAll(vis.element);
      });

      it('should remove all DOM elements from the el', function() {
        expect($(vis.element).children().length).to.be(0);
      });
    });
  });
});
