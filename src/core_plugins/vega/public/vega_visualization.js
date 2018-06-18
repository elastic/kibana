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

import { Notifier } from 'ui/notify';
import { VegaView } from './vega_view/vega_view';
import { VegaMapView } from './vega_view/vega_map_view';

export function VegaVisualizationProvider(vegaConfig, serviceSettings) {

  const notify = new Notifier({ location: 'Vega' });

  return class VegaVisualization {
    constructor(el, vis) {
      this._el = el;
      this._vis = vis;
    }

    /**
     *
     * @param {VegaParser} visData
     * @param {*} status
     * @returns {Promise<void>}
     */
    async render(visData, status) {
      if (!visData && !this._vegaView) {
        notify.warning('Unable to render without data');
        return;
      }

      try {

        await this._render(visData, status);

      } catch (error) {
        if (this._vegaView) {
          this._vegaView.onError(error);
        } else {
          notify.error(error);
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

        if (vegaParser.useMap) {
          this._vegaView = new VegaMapView(vegaConfig, this._vis.editorMode, this._el, vegaParser, serviceSettings);
        } else {
          this._vegaView = new VegaView(vegaConfig, this._vis.editorMode, this._el, vegaParser, serviceSettings);
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
}
