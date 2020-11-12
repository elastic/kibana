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
import React, { RefObject } from 'react';

import { mountReactNode } from '../../../core/public/utils';
import { ChartsPluginSetup } from '../../charts/public';
import { PersistedState } from '../../visualizations/public';
import { IInterpreterRenderHandlers } from '../../expressions/public';

import { VisTypeVislibCoreSetup } from './plugin';
import { VisLegend, CUSTOM_LEGEND_VIS_TYPES } from './vislib/components/legend';
import { BasicVislibParams } from './types';
import { PieVisParams } from './pie';

const legendClassName = {
  top: 'vislib--legend-top',
  bottom: 'vislib--legend-bottom',
  left: 'vislib--legend-left',
  right: 'vislib--legend-right',
};

export type VislibVisController = InstanceType<ReturnType<typeof createVislibVisController>>;

export const createVislibVisController = (
  core: VisTypeVislibCoreSetup,
  charts: ChartsPluginSetup
) => {
  return class VislibVisController {
    private removeListeners?: () => void;
    private unmountLegend?: () => void;

    legendRef: RefObject<VisLegend>;
    container: HTMLDivElement;
    chartEl: HTMLDivElement;
    legendEl: HTMLDivElement;
    vislibVis?: any;

    constructor(public el: HTMLDivElement) {
      this.el = el;
      this.legendRef = React.createRef();

      // vis mount point
      this.container = document.createElement('div');
      this.container.className = 'vislib';
      this.el.appendChild(this.container);

      // chart mount point
      this.chartEl = document.createElement('div');
      this.chartEl.className = 'vislib__chart';
      this.container.appendChild(this.chartEl);

      // legend mount point
      this.legendEl = document.createElement('div');
      this.legendEl.className = 'vislib__legend';
      this.container.appendChild(this.legendEl);
    }

    async render(
      esResponse: any,
      visParams: BasicVislibParams | PieVisParams,
      handlers: IInterpreterRenderHandlers
    ): Promise<void> {
      if (this.vislibVis) {
        this.destroy(false);
      }

      // Used in functional tests to know when chart is loaded by type
      this.chartEl.dataset.vislibChartType = visParams.type;

      if (this.el.clientWidth === 0 || this.el.clientHeight === 0) {
        handlers.done();
        return;
      }

      const [, { kibanaLegacy }] = await core.getStartServices();
      kibanaLegacy.loadFontAwesome();

      // @ts-expect-error
      const { Vis: Vislib } = await import('./vislib/vis');
      const { data, event: fireEvent } = handlers;
      const uiState = data as PersistedState;

      this.vislibVis = new Vislib(this.chartEl, visParams, core, charts);
      this.vislibVis.on('brush', fireEvent);
      this.vislibVis.on('click', fireEvent);
      this.vislibVis.on('renderComplete', handlers.done);
      this.removeListeners = () => {
        this.vislibVis.off('brush', fireEvent);
        this.vislibVis.off('click', fireEvent);
      };

      this.vislibVis.initVisConfig(esResponse, uiState);

      if (visParams.addLegend) {
        $(this.container)
          .attr('class', (i, cls) => {
            return cls.replace(/vislib--legend-\S+/g, '');
          })
          .addClass((legendClassName as any)[visParams.legendPosition]);

        this.mountLegend(esResponse, visParams, fireEvent, uiState);
      }

      this.vislibVis.render(esResponse, uiState);

      // refreshing the legend after the chart is rendered.
      // this is necessary because some visualizations
      // provide data necessary for the legend only after a render cycle.
      if (
        visParams.addLegend &&
        CUSTOM_LEGEND_VIS_TYPES.includes(this.vislibVis.visConfigArgs.type)
      ) {
        this.unmountLegend?.();
        this.mountLegend(esResponse, visParams, fireEvent, uiState);
        this.vislibVis.render(esResponse, uiState);
      }
    }

    mountLegend(
      visData: unknown,
      { legendPosition, addLegend }: BasicVislibParams | PieVisParams,
      fireEvent: IInterpreterRenderHandlers['event'],
      uiState?: PersistedState
    ) {
      this.unmountLegend = mountReactNode(
        <VisLegend
          ref={this.legendRef}
          vislibVis={this.vislibVis}
          visData={visData}
          uiState={uiState}
          fireEvent={fireEvent}
          addLegend={addLegend}
          position={legendPosition}
        />
      )(this.legendEl);
    }

    destroy(clearElement = true) {
      this.unmountLegend?.();

      if (clearElement) {
        this.el.innerHTML = '';
      }

      if (this.vislibVis) {
        this.removeListeners?.();
        this.vislibVis.destroy();
        delete this.vislibVis;
      }
    }
  };
};
