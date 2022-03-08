/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import $ from 'jquery';
import React, { RefObject } from 'react';

import { mountReactNode } from '../../../../core/public/utils';
import { ChartsPluginSetup } from '../../../charts/public';
import type { PersistedState } from '../../../visualizations/public';
import { IInterpreterRenderHandlers } from '../../../expressions/public';

import { VisTypeVislibCoreSetup } from './plugin';
import { VisLegend, CUSTOM_LEGEND_VIS_TYPES } from './vislib/components/legend';
import { BasicVislibParams } from './types';
import { LegendDisplay, PieVisParams } from './pie';

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
    removeListeners?: () => void;
    unmountLegend?: () => void;

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

      // @ts-expect-error
      const { Vis: Vislib } = await import('./vislib/vis');
      const { uiState, event: fireEvent } = handlers;

      this.vislibVis = new Vislib(this.chartEl, visParams, core, charts);
      this.vislibVis.on('brush', fireEvent);
      this.vislibVis.on('click', fireEvent);
      this.vislibVis.on('renderComplete', handlers.done);
      this.removeListeners = () => {
        this.vislibVis.off('brush', fireEvent);
        this.vislibVis.off('click', fireEvent);
      };

      this.vislibVis.initVisConfig(esResponse, uiState);

      if (this.showLegend(visParams)) {
        $(this.container)
          .attr('class', (i, cls) => {
            return cls.replace(/vislib--legend-\S+/g, '');
          })
          .addClass((legendClassName as any)[visParams.legendPosition]);

        this.mountLegend(esResponse, visParams, fireEvent, uiState as PersistedState);
      }

      this.vislibVis.render(esResponse, uiState);

      // refreshing the legend after the chart is rendered.
      // this is necessary because some visualizations
      // provide data necessary for the legend only after a render cycle.
      if (
        this.showLegend(visParams) &&
        CUSTOM_LEGEND_VIS_TYPES.includes(this.vislibVis.visConfigArgs.type)
      ) {
        this.unmountLegend?.();
        this.mountLegend(esResponse, visParams, fireEvent, uiState as PersistedState);
        this.vislibVis.render(esResponse, uiState);
      }
    }

    mountLegend(
      visData: unknown,
      visParams: BasicVislibParams | PieVisParams,
      fireEvent: IInterpreterRenderHandlers['event'],
      uiState?: PersistedState
    ) {
      const { legendPosition } = visParams;
      this.unmountLegend = mountReactNode(
        <VisLegend
          ref={this.legendRef}
          vislibVis={this.vislibVis}
          visData={visData}
          uiState={uiState}
          fireEvent={fireEvent}
          addLegend={this.showLegend(visParams)}
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

    showLegend(visParams: BasicVislibParams | PieVisParams) {
      if (this.arePieVisParams(visParams)) {
        return visParams.legendDisplay === LegendDisplay.SHOW;
      }
      return visParams.addLegend ?? false;
    }

    arePieVisParams(visParams: BasicVislibParams | PieVisParams): visParams is PieVisParams {
      return Object.values(LegendDisplay).includes((visParams as PieVisParams).legendDisplay);
    }
  };
};
