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

    /**
     * Find index pattern by its title, of if not given, gets default
     * @param {string} [index]
     * @returns {Promise<string>} index id
     */
    async findIndex(index: string) {
      const { indexPatterns } = this.dataPlugin;
      let idxObj;

      if (index) {
        idxObj = await indexPatterns.findByTitle(index);
        if (!idxObj) {
          throw new Error(
            i18n.translate('visTypeVega.visualization.indexNotFoundErrorMessage', {
              defaultMessage: 'Index {index} not found',
              values: { index: `"${index}"` },
            })
          );
        }
      } else {
        idxObj = await indexPatterns.getDefault();
        if (!idxObj) {
          throw new Error(
            i18n.translate('visTypeVega.visualization.unableToFindDefaultIndexErrorMessage', {
              defaultMessage: 'Unable to find default index',
            })
          );
        }
      }
      return idxObj.id;
    }

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
          findIndex: this.findIndex.bind(this),
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
