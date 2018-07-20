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

import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import _ from 'lodash';
import { BaseMapsVisualizationProvider } from '../../tile_map/public/base_maps_visualization';
import ChoroplethLayer from './choropleth_layer';
import { truncatedColorMaps }  from 'ui/vislib/components/color/truncated_colormaps';
import AggResponsePointSeriesTooltipFormatterProvider from './tooltip_formatter';
import 'ui/vis/map/service_settings';
import { toastNotifications } from 'ui/notify';

export function RegionMapsVisualizationProvider(Private, config) {

  const tooltipFormatter = Private(AggResponsePointSeriesTooltipFormatterProvider);
  const BaseMapsVisualization = Private(BaseMapsVisualizationProvider);

  return class RegionMapsVisualization extends BaseMapsVisualization {

    constructor(container, vis) {
      super(container, vis);
      this._vis = this.vis;
      this._choroplethLayer = null;
    }

    async render(esResponse, status) {
      await super.render(esResponse, status);
      if (this._choroplethLayer) {
        await this._choroplethLayer.whenDataLoaded();
      }
    }

    async _updateData(tableGroup) {
      this._chartData = tableGroup;
      let results;
      if (!tableGroup || !tableGroup.tables || !tableGroup.tables.length || tableGroup.tables[0].columns.length !== 2) {
        results = [];
      } else {
        const buckets = tableGroup.tables[0].rows;
        results = buckets.map(([term, value]) => {
          return { term: term, value: value };
        });
      }

      if (!this._vis.params.selectedJoinField && this._vis.params.selectedLayer) {
        this._vis.params.selectedJoinField = this._vis.params.selectedLayer.fields[0];
      }

      if (!this._vis.params.selectedLayer) {
        return;
      }

      this._updateChoroplethLayerForNewMetrics(
        this._vis.params.selectedLayer.url,
        this._vis.params.selectedLayer.attribution,
        this._vis.params.showAllShapes,
        results
      );
      const metricsAgg = _.first(this._vis.getAggConfig().bySchemaName.metric);
      this._choroplethLayer.setMetrics(results, metricsAgg);
      this._setTooltipFormatter();

      this._kibanaMap.useUiStateFromVisualization(this._vis);
    }

    async  _updateParams() {

      await super._updateParams();

      const visParams = this.vis.params;
      if (!visParams.selectedJoinField && visParams.selectedLayer) {
        visParams.selectedJoinField = visParams.selectedLayer.fields[0];
      }

      if (!visParams.selectedJoinField || !visParams.selectedLayer) {
        return;
      }

      this._updateChoroplethLayerForNewProperties(
        visParams.selectedLayer.url,
        visParams.selectedLayer.attribution,
        this._vis.params.showAllShapes
      );
      this._choroplethLayer.setJoinField(visParams.selectedJoinField.name);
      this._choroplethLayer.setColorRamp(truncatedColorMaps[visParams.colorSchema]);
      this._choroplethLayer.setLineWeight(visParams.outlineWeight);
      this._setTooltipFormatter();

    }

    _updateChoroplethLayerForNewMetrics(url, attribution, showAllData, newMetrics) {
      if (this._choroplethLayer && this._choroplethLayer.canReuseInstanceForNewMetrics(url, showAllData, newMetrics)) {
        return;
      }
      return this._recreateChoroplethLayer(url, attribution, showAllData);
    }

    _updateChoroplethLayerForNewProperties(url, attribution, showAllData) {
      if (this._choroplethLayer && this._choroplethLayer.canReuseInstance(url, showAllData)) {
        return;
      }
      return this._recreateChoroplethLayer(url, attribution, showAllData);
    }

    _recreateChoroplethLayer(url, attribution, showAllData) {

      this._kibanaMap.removeLayer(this._choroplethLayer);


      if (this._choroplethLayer) {
        this._choroplethLayer = this._choroplethLayer.cloneChoroplethLayerForNewData(
          url,
          attribution,
          this.vis.params.selectedLayer.format,
          showAllData,
          this.vis.params.selectedLayer.meta
        );
      } else {
        this._choroplethLayer = new ChoroplethLayer(
          url,
          attribution,
          this.vis.params.selectedLayer.format,
          showAllData,
          this.vis.params.selectedLayer.meta
        );
      }

      this._choroplethLayer.on('select', (event) => {


        if (!this._isAggReady()) {
          //even though we have maps data available and have added the choropleth layer to the map
          //the aggregation may not be available yet
          return;
        }

        const rowIndex = this._chartData.tables[0].rows.findIndex(row => row[0] === event);
        this._vis.API.events.addFilter(this._chartData.tables[0], 0, rowIndex, event);
      });

      this._choroplethLayer.on('styleChanged', (event) => {
        const shouldShowWarning = this._vis.params.isDisplayWarning && config.get('visualization:regionmap:showWarnings');
        if (event.mismatches.length > 0 && shouldShowWarning) {
          toastNotifications.addWarning({
            title: `Unable to show ${event.mismatches.length} ${event.mismatches.length > 1 ? 'results' : 'result'} on map`,
            text: `Ensure that each of these term matches a shape on that shape's join field: ${event.mismatches.join(', ')}`,
          });
        }
      });


      this._kibanaMap.addLayer(this._choroplethLayer);

    }

    _isAggReady() {
      return this._vis.getAggConfig().bySchemaName.segment && this._vis.getAggConfig().bySchemaName.segment[0];
    }


    _setTooltipFormatter() {
      const metricsAgg = _.first(this._vis.getAggConfig().bySchemaName.metric);
      if (this._isAggReady()) {
        const fieldName = this._vis.getAggConfig().bySchemaName.segment[0].makeLabel();
        this._choroplethLayer.setTooltipFormatter(tooltipFormatter, metricsAgg, fieldName);
      } else {
        this._choroplethLayer.setTooltipFormatter(tooltipFormatter, metricsAgg, null);
      }
    }

  };

}
