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
import chrome from 'ui/chrome';
import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';
import { VegaView } from './vega_view/vega_view';
import { VegaMapView } from './vega_view/vega_map_view';
import { timefilter } from 'ui/timefilter';
import { start as data } from '../../../core_plugins/data/public/legacy';

import { findIndexPatternByTitle } from '../../data/public/index_patterns';

export const createVegaVisualization = ({ serviceSettings }) =>
  class VegaVisualization {
    constructor(el, vis) {
      this.savedObjectsClient = chrome.getSavedObjectsClient();
      this._el = el;
      this._vis = vis;
    }

    /**
     * Find index pattern by its title, of if not given, gets default
     * @param {string} [index]
     * @returns {Promise<string>} index id
     */
    async findIndex(index) {
      let idxObj;
      if (index) {
        idxObj = await findIndexPatternByTitle(this.savedObjectsClient, index);
        if (!idxObj) {
          throw new Error(
            i18n.translate('visTypeVega.visualization.indexNotFoundErrorMessage', {
              defaultMessage: 'Index {index} not found',
              values: { index: `"${index}"` },
            })
          );
        }
      } else {
        idxObj = await data.indexPatterns.indexPatterns.getDefault();
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

    /**
     *
     * @param {VegaParser} visData
     * @param {*} status
     * @returns {Promise<void>}
     */
    async render(visData, visParams, status) {
      if (!visData && !this._vegaView) {
        toastNotifications.addWarning(
          i18n.translate('visTypeVega.visualization.unableToRenderWithoutDataWarningMessage', {
            defaultMessage: 'Unable to render without data',
          })
        );
        return;
      }

      try {
        await this._render(visData, status);
      } catch (error) {
        if (this._vegaView) {
          this._vegaView.onError(error);
        } else {
          toastNotifications.addError(error, {
            title: i18n.translate('visTypeVega.visualization.renderErrorTitle', {
              defaultMessage: 'Vega error',
            }),
          });
        }
      }
    }

    async _render(vegaParser, status) {
      if (vegaParser && (status.data || !this._vegaView)) {
        // New data received, rebuild the graph
        if (this._vegaView) {
          await this._vegaView.destroy();
          this._vegaView = null;
        }

        const vegaViewParams = {
          parentEl: this._el,
          vegaParser,
          serviceSettings,
          queryfilter: data.filter.filterManager,
          timefilter: timefilter,
          findIndex: this.findIndex.bind(this),
        };

        if (vegaParser.useMap) {
          this._vegaView = new VegaMapView(vegaViewParams);
        } else {
          this._vegaView = new VegaView(vegaViewParams);
        }
        await this._vegaView.init();
      } else if (status.resize) {
        // the graph has been resized
        await this._vegaView.resize();
      }
    }

    destroy() {
      return this._vegaView && this._vegaView.destroy();
    }
  };
