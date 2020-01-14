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

import $ from 'jquery';
import React from 'react';

import {
  CUSTOM_LEGEND_VIS_TYPES,
  VisLegend,
} from '../../../ui/public/vis/vis_types/vislib_vis_legend';
import { VislibVisProvider } from '../../../ui/public/vislib/vis';
import chrome from '../../../ui/public/chrome';
import { mountReactNode } from '../../../../core/public/utils';

const legendClassName = {
  top: 'visLib--legend-top',
  bottom: 'visLib--legend-bottom',
  left: 'visLib--legend-left',
  right: 'visLib--legend-right',
};

export class vislibVisController {
  constructor(el, vis) {
    this.el = el;
    this.vis = vis;
    this.unmount = null;
    this.legendRef = React.createRef();

    // vis mount point
    this.container = document.createElement('div');
    this.container.className = 'visLib';
    this.el.appendChild(this.container);

    // chart mount point
    this.chartEl = document.createElement('div');
    this.chartEl.className = 'visLib__chart';
    this.container.appendChild(this.chartEl);
    // legend mount point
    this.legendEl = document.createElement('div');
    this.legendEl.className = 'visLib__legend';
    this.container.appendChild(this.legendEl);
  }

  render(esResponse, visParams) {
    if (this.vislibVis) {
      this.destroy();
    }

    return new Promise(async resolve => {
      if (!this.vislib) {
        const $injector = await chrome.dangerouslyGetActiveInjector();
        const Private = $injector.get('Private');
        this.Vislib = Private(VislibVisProvider);
      }

      if (this.el.clientWidth === 0 || this.el.clientHeight === 0) {
        return resolve();
      }

      this.vislibVis = new this.Vislib(this.chartEl, visParams);
      this.vislibVis.on('brush', this.vis.API.events.brush);
      this.vislibVis.on('click', this.vis.API.events.filter);
      this.vislibVis.on('renderComplete', resolve);

      this.vislibVis.initVisConfig(esResponse, this.vis.getUiState());

      if (visParams.addLegend) {
        $(this.container)
          .attr('class', (i, cls) => {
            return cls.replace(/visLib--legend-\S+/g, '');
          })
          .addClass(legendClassName[visParams.legendPosition]);

        this.mountLegend(esResponse, visParams.legendPosition);
      }

      this.vislibVis.render(esResponse, this.vis.getUiState());

      // refreshing the legend after the chart is rendered.
      // this is necessary because some visualizations
      // provide data necessary for the legend only after a render cycle.
      if (
        visParams.addLegend &&
        CUSTOM_LEGEND_VIS_TYPES.includes(this.vislibVis.visConfigArgs.type)
      ) {
        this.unmountLegend();
        this.mountLegend(esResponse, visParams.legendPosition);
        this.vislibVis.render(esResponse, this.vis.getUiState());
      }
    });
  }

  mountLegend(visData, position) {
    this.unmount = mountReactNode(
      <VisLegend
        ref={this.legendRef}
        vis={this.vis}
        vislibVis={this.vislibVis}
        visData={visData}
        position={position}
        uiState={this.vis.getUiState()}
      />
    )(this.legendEl);
  }

  unmountLegend() {
    if (this.unmount) {
      this.unmount();
    }
  }

  destroy() {
    if (this.unmount) {
      this.unmount();
    }

    if (this.vislibVis) {
      this.vislibVis.off('brush', this.vis.API.events.brush);
      this.vislibVis.off('click', this.vis.API.events.filter);
      this.vislibVis.destroy();
      delete this.vislibVis;
    }
  }
}
