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

import React from 'react';
import d3 from 'd3';
import $ from 'jquery';
import moment from 'moment';
import { render, unmountComponentAtNode } from 'react-dom';
import { CalendarChart } from './components/chart/calendar_chart';
import { legendPosition, LegendBar } from './components/legend';
import { CalendarVisConfig, calendarDataObjectProvider, calendarDispatchProvider, CalendarErrorHandler } from './lib';
import { ValueAxis } from './components/chart/axis/value_axis';
import { KbnError, NoResults, SearchTimeout } from 'ui/errors';
import { EuiTooltip } from './components/tooltip';
import { HashTable, getTimeFormat } from './utils';
import { InvalidBucketError } from './errors';
import { containerName, chartCanvas, chartWrapperName, legendName, tooltipId, tooltipName } from './default_settings';
import './calendar_visualization.less';

export function calendarVisualizationProvider(config) {

  const VisConfig = CalendarVisConfig;
  const Data = calendarDataObjectProvider(config);
  const CalendarDispatch = calendarDispatchProvider(config);
  const bindAnchorEvent = function (e) {
    const self = this;
    self.anchorEvent = e;
    new Promise((resolve) => {
      self.renderDOM(<EuiTooltip
        id={tooltipId}
        formatter={self.tooltipFormatter}
        dispatch={self.dispatch}
        hashTable={self.hashTable}
        renderComplete={resolve}
        anchorEvent={self.anchorEvent}
        container={self.calendarVis}
      />, self.tooltipContainer);
    });
  };

  class CalendarVisualization {
    constructor(el, vis) {
      this.el = el;
      this.vis = vis;
      this.container = document.createElement('div');
      this.container.className = containerName;
      this.el.appendChild(this.container);
      this.dispatch = new CalendarDispatch(CalendarErrorHandler.bindEl(this.container));
      this.calendarVis = document.createElement('div');
      this.calendarVis.className = chartCanvas;
      this.charts = [];
      this.visConfig = new VisConfig(vis.params);
      this.valueAxes = this.visConfig.get('valueAxes').map(axisConfig => new ValueAxis(this.visConfig, axisConfig, this.vis));
      this.anchorEvent = null;
      this.tooltipContainer = null;
      this.legendNode = null;
      this.hashTable = new HashTable();
    }

    renderDOM(component, node) {
      render(component, node);
    }

    unmountDOM(node) {
      unmountComponentAtNode(node);
    }

    async _unmountChart() {
      this.charts.forEach((cEl) => {
        this.unmountDOM(cEl);
      });
      this.charts = [];
      while (this.calendarVis.firstChild) {
        this.calendarVis.removeChild(this.calendarVis.firstChild);
      }
      this.container.removeChild(this.calendarVis);
    }

    async _mountChart(vislibData) {
      const visFragment = document.createDocumentFragment();

      const data = vislibData.getData();
      const numberOfCharts = data.length;
      for(let i = 0; i < numberOfCharts; ++i) {
        const d = document.createElement('div');
        d.className = chartWrapperName;
        this.charts.push(d);
        visFragment.appendChild(d);
      }
      this.calendarVis.appendChild(visFragment);
      this.container.appendChild(this.calendarVis);
      const self = this;

      const renderArray = this.charts.map((cEl, i) => {
        return new Promise((resolve) => {
          self.renderDOM(<CalendarChart
            id={`chart_${vislibData.dataAt(i).label.slice(0, 4)}`}
            visConfig={self.visConfig}
            vislibData={vislibData.dataAt(i)}
            renderComplete={resolve}
          />, cEl);
        });
      });

      await Promise.all(renderArray);
    }

    async _removeLegend() {
      this.unmountDOM(this.legendNode);
      if(this.container.contains(this.legendNode)) {
        this.container.removeChild(this.legendNode);
      }
      this.legendNode = null;
    }

    async _renderLegend(vislibData) {
      const self = this;
      const container = this.container;
      this.legendNode = document.createElement('div');
      container.appendChild(this.legendNode);
      this.legendNode.className = legendName;
      function setUiState(state, value) {
        const uiState = self.vis.getUiState();
        uiState.set(state, value);
      }
      function getUiState(state) {
        return self.vis.getUiState().get(state);
      }
      await new Promise((resolve) => {
        self.renderDOM(<LegendBar
          visConfig={self.visConfig}
          colorFunc={vislibData.getColorFunc()}
          position={legendPosition[self.vis.params.legendPosition]}
          dispatch={self.dispatch}
          setUiState={setUiState}
          getUiState={getUiState}
          renderComplete={resolve}
        />, self.legendNode);
      });
    }

    async _removeTooltip() {
      this.calendarVis.removeEventListener('mouseover', bindAnchorEvent.bind(this, 'mouseover'));
      this.calendarVis.removeEventListener('mouseout', bindAnchorEvent.bind(this, 'mouseout'));
      this.unmountDOM(this.tooltipContainer);
      if (this.container.contains(this.tooltipContainer)) {
        this.container.removeChild(this.tooltipContainer);
      }
      this.tooltipContainer = null;
      this.tooltipFormatter = null;
    }

    async _renderTooltip(vislibData) {
      this.tooltipFormatter = vislibData.get('tooltipFormatter');
      this.tooltipContainer = document.createElement('div');
      this.tooltipContainer.className = tooltipName;
      this.container.appendChild(this.tooltipContainer);
      this.calendarVis.addEventListener('mouseover', bindAnchorEvent.bind(this));
      this.calendarVis.addEventListener('mouseout', bindAnchorEvent.bind(this));
    }

    async _addCircleEvents(selection) {
      $(this.container).find('[data-label]').removeData('label');
      const hover = this.dispatch.addHoverEvent();
      const mouseout = this.dispatch.addMouseoutEvent();
      return selection.call(hover).call(mouseout);
    }

    async _render(vislibData, updateStatus) {
      const { aggs, data, params, time, resize } = updateStatus;

      if((params && resize) || (data && time) || (data && !aggs && !params && !time && !resize)) {
        if(this.container.contains(this.calendarVis)) {
          await this._unmountChart();
        }
        await this._mountChart(vislibData);
      }

      if(aggs || data || params || time) {
        const renderValues = this.valueAxes.map(async (axis) => {
          await axis.drawValues(vislibData);
        });
        await renderValues;
        const addons = [];
        if (this.visConfig.get('enableHover')) {
          addons.push(this._addCircleEvents(d3.selectAll('.data-day')));
        }
        if (this.visConfig.get('addTooltip')) {
          if (this.tooltipContainer !== null) {
            await this._removeTooltip();
          }
          addons.push(this._renderTooltip(vislibData));
        }
        const addLegend = this.visConfig.get('addLegend');
        if (addLegend) {
          if (this.legendNode !== null) {
            await this._removeLegend();
          }
          addons.push(this._renderLegend(vislibData));
        }
        await Promise.all(addons);
      }
    }

    _validateData(data) {
      if(typeof data !== 'object') {
        throw new TypeError(`invalid type ${typeof data} of visData, should be object`);
      }
      if (data.hits === 0) {
        throw new NoResults();
      }
      if (data.timed_out) {
        throw new SearchTimeout();
      }
    }

    _putAll(visData) {
      try {
        visData.rows.forEach(r => {
          const vals = r.series[0].values;
          vals.forEach(v => {
            const dayId = 'day_' + moment(v.x).format(getTimeFormat());
            this.hashTable.put(dayId, v);
          });
        });
      } catch(error) {
        if(error.message.includes('the entry already exists')) {
          throw new InvalidBucketError({
            msg: 'hidden date histogram',
            directTo: '#/management/kibana/settings#histogram:maxBars-aria-title',
            changeInstruction: 'increase Maximum bars to disable bucket autoscaling'
          });
        }
      }
    }

    render(visData, updateStatus) {
      const self = this;
      try {
        this._validateData(visData);
        this.hashTable.clearAll();
        this._putAll(visData);
        this.dispatch.handler.removeError();
        const vislibData = new Data(visData, this.vis.getUiState());
        return this._render(vislibData, updateStatus);
      } catch (error) {
        if (error instanceof KbnError) {
          return new Promise(async (resolve) => {
            await self.destroy();
            error.displayToScreen(this.dispatch.handler);
            resolve();
          });
        } else {
          throw error;
        }
      }
    }

    destroy() {
      const self = this;
      return new Promise(async (resolve) => {
        if (self.tooltipContainer !== null) {
          await self._removeTooltip();
        }
        if (self.legendNode !== null) {
          await self._removeLegend();
        }
        if(this.container.contains(this.calendarVis)) {
          await self._unmountChart();
        }
        resolve();
      });
    }
  }

  return CalendarVisualization;
}

