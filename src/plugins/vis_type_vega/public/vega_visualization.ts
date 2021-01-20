/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { VegaParser } from './data_model/vega_parser';
import { VegaVisualizationDependencies } from './plugin';
import { getNotifications, getData } from './services';
import type { VegaView } from './vega_view/vega_view';

export const createVegaVisualization = ({ getServiceSettings }: VegaVisualizationDependencies) =>
  class VegaVisualization {
    private readonly dataPlugin = getData();
    private vegaView: InstanceType<typeof VegaView> | null = null;

    constructor(
      private el: HTMLDivElement,
      private fireEvent: IInterpreterRenderHandlers['event']
    ) {}

    async render(visData: VegaParser) {
      const { toasts } = getNotifications();

      if (!visData && !this.vegaView) {
        toasts.addWarning(
          i18n.translate('visTypeVega.visualization.unableToRenderWithoutDataWarningMessage', {
            defaultMessage: 'Unable to render without data',
          })
        );
        return;
      }

      try {
        await this._render(visData);
      } catch (error) {
        if (this.vegaView) {
          this.vegaView.onError(error);
        } else {
          toasts.addError(error, {
            title: i18n.translate('visTypeVega.visualization.renderErrorTitle', {
              defaultMessage: 'Vega error',
            }),
          });
        }
      }
    }

    async _render(vegaParser: VegaParser) {
      if (vegaParser) {
        // New data received, rebuild the graph
        if (this.vegaView) {
          await this.vegaView.destroy();
          this.vegaView = null;
        }

        const serviceSettings = await getServiceSettings();
        const { filterManager } = this.dataPlugin.query;
        const { timefilter } = this.dataPlugin.query.timefilter;
        const vegaViewParams = {
          parentEl: this.el,
          fireEvent: this.fireEvent,
          vegaParser,
          serviceSettings,
          filterManager,
          timefilter,
        };

        if (vegaParser.useMap) {
          const { VegaMapView } = await import('./vega_view/vega_map_view');
          this.vegaView = new VegaMapView(vegaViewParams);
        } else {
          const { VegaView: VegaViewClass } = await import('./vega_view/vega_view');
          this.vegaView = new VegaViewClass(vegaViewParams);
        }
        await this.vegaView?.init();
      }
    }

    destroy() {
      this.vegaView?.destroy();
    }
  };
