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

import { expect } from 'chai';
import ngMock from 'ng_mock';
import $ from 'jquery';
import sinon from 'sinon';
import Enzyme, { shallow } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';

Enzyme.configure({ adapter: new Adapter() });
import LogstashIndexPatternStubProvider from 'fixtures/stubbed_logstash_index_pattern';
import * as visModule from 'ui/vis';
import {
  calendarVisualizationProvider,
} from '../calendar_visualization';
import {
  containerName,
  chartCanvas,
  chartWrapperName,
  tooltipName,
  tooltipId,
  legendName,
  defaultParams
} from '../default_settings';
import aggResponse from './agg_response.json';

describe('CalendarVisualizations', () => {

  let domNode;
  let CalendarVisualization;
  let renderDOM;
  let unmountDOM;
  let calendarVis;
  let Vis;
  let vis;
  let indexPattern;
  let visData;
  let updateStatus;
  const defaultVisState = {
    type: 'calendar',
    params: defaultParams,
    aggs: [
      {
        schema: 'metric',
        type: 'count'
      },
      {
        schema: 'segment',
        type: 'date_histogram',
        params: {
          interval: 'd'
        }
      },
      {
        schema: 'split',
        type: 'date_histogram',
        params: {
          interval: 'y'
        }
      }
    ]
  };

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject((Private, config) => {

    Vis = Private(visModule.VisProvider);
    CalendarVisualization = calendarVisualizationProvider(config);
    indexPattern = Private(LogstashIndexPatternStubProvider);

    vis = new Vis(indexPattern, defaultVisState);
    updateStatus = {
      aggs: true,
      data: true,
      params: true,
      resize: true,
      time: true,
      uiState: true
    };

  }));

  describe('CalendarVisualizations - shallow rendered on changing params', () => {

    beforeEach(() => {
      setupDOM('512px', '512px');
      visData = aggResponse;
      renderDOM = CalendarVisualization.prototype.renderDOM;
      unmountDOM = CalendarVisualization.prototype.unmountDOM;
      CalendarVisualization.prototype.renderDOM = function (component, node) {
        const obj = shallow(component);
        $(node).data('enzyme-shallow', obj);
      };
      CalendarVisualization.prototype.unmountDOM = function (node) {
        $(node).removeData('enzyme-shallow');
      };
    });

    afterEach(() => {
      visData = null;
      CalendarVisualization.prototype.renderDOM = renderDOM;
      CalendarVisualization.prototype.unmountDOM = unmountDOM;
      calendarVis.destroy();
      calendarVis = null;
      updateStatus = null;
      teardomDOM();
    });

    it('should render charts, legend and tooltip', async () => {

      calendarVis = new CalendarVisualization(domNode, vis);
      await calendarVis.render(visData, updateStatus);

      shouldRenderWith({
        charts: true,
        tooltip: true,
        legend: true
      });
    });

    it('should render charts, tooltip without legend', async () => {

      vis.params.addLegend = false;
      calendarVis = new CalendarVisualization(domNode, vis);
      await calendarVis.render(visData, updateStatus);

      shouldRenderWith({
        charts: true,
        tooltip: true,
        legend: false
      });
    });

    it('should render charts, legend without tooltip', async () => {

      vis.params.addTooltip = false;
      calendarVis = new CalendarVisualization(domNode, vis);
      await calendarVis.render(visData, updateStatus);

      shouldRenderWith({
        charts: true,
        legend: true,
        tooltip: false
      });
    });

    it('should render only charts', async () => {

      vis.params.addLegend = false;
      vis.params.addTooltip = false;
      calendarVis = new CalendarVisualization(domNode, vis);
      await calendarVis.render(visData, updateStatus);

      shouldRenderWith({
        charts: true,
        tooltip: false,
        legend: false
      });
    });

  });

  describe('CalendarVisualizations - fully rendered with charts, tooltip and legend', () => {

    beforeEach(() => {
      setupDOM('512px', '512px');
      visData = aggResponse;
      visData.rows.forEach(r => {
        r.tooltipFormatter = function () {}; //enforce a fake function to pass sinon compliation
        sinon.stub(r, 'tooltipFormatter').callsFake(function () {
          return '';
        });
      });
    });

    afterEach(() => {
      visData = null;
      calendarVis.destroy();
      calendarVis = null;
      updateStatus = null;
      teardomDOM();
    });

    it('should popup a tooltip when mouseover a data cell, hide the tooltip when mouseout', async () => {

      calendarVis = new CalendarVisualization(domNode, vis);
      await calendarVis.render(visData, updateStatus);

      const canvas = domNode.querySelector(`.${chartCanvas.split(' ')[1]}`);
      const dataCell = canvas.querySelector('.data-day');

      $(dataCell).mouseover(() => {
        const tooltip = document.querySelector('#' + tooltipId);
        expect(tooltip instanceof HTMLElement).to.equal(true);
      });

      $(dataCell).mouseout(() => {
        const tooltip = document.querySelector('#' + tooltipId);
        expect(tooltip instanceof HTMLElement).to.equal(false);
      });
    });

    it('should dim and undim data labels when hover is enabled', async () => {

      vis.params.enableHover = true;
      calendarVis = new CalendarVisualization(domNode, vis);
      await calendarVis.render(visData, updateStatus);

      sinon.spy(calendarVis.dispatch, 'highlight');
      sinon.spy(calendarVis.dispatch, 'unHighlight');

      const canvas = domNode.querySelector(`.${chartCanvas.split(' ')[1]}`);
      const dataCell = canvas.querySelector('.data-day');


      $(dataCell).mouseover(() => {
        expect(calendarVis.dispatch.highlight.calledOnce).to.equal(true);
      });

      $(dataCell).mouseout(() => {
        expect(calendarVis.dispatch.unHighlight.calledOnce).to.equal(true);
      });

    });
  });

  function setupDOM(width, height) {
    domNode = document.createElement('div');
    domNode.style.width = width;
    domNode.style.height = height;
    document.body.appendChild(domNode);
  }

  function teardomDOM() {
    domNode.innerHTML = '';
    document.body.removeChild(domNode);
  }

  function shouldRenderWith({ charts, tooltip, legend }) {
    const hasCharts = Boolean(charts);
    const hasTooltip = Boolean(tooltip);
    const hasLegend = Boolean(legend);

    const container = domNode.querySelector(`.${containerName.split(' ')[1]}`);
    expect(container instanceof HTMLElement).to.equal(true);

    if(hasCharts) {
      const canvas = container.querySelector(`.${chartCanvas.split(' ')[1]}`);
      expect(canvas instanceof HTMLElement).to.equal(true);
      const chartsEl = canvas.querySelectorAll(`.${chartWrapperName}`);
      expect(chartsEl instanceof NodeList).to.equal(true);
      [].slice.call(chartsEl).forEach(chart => {
        expect(chart instanceof HTMLElement).to.equal(true);
      });

      const legendEl = container.querySelector(`.${legendName.split(' ')[1]}`);
      expect(legendEl instanceof HTMLElement).to.equal(hasLegend);

      const tooltipEl = container.querySelector(`.${tooltipName}`);
      expect(tooltipEl instanceof HTMLElement).to.equal(hasTooltip);
    }
  }

});
