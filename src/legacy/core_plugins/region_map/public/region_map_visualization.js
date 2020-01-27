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
import ChoroplethLayer from './choropleth_layer';
import { truncatedColorMaps } from 'ui/color_maps';
import { getFormat } from 'ui/visualize/loader/pipeline_helpers/utilities';
import { toastNotifications } from 'ui/notify';

import { TileMapTooltipFormatter } from './tooltip_formatter';

// TODO: reference to TILE_MAP plugin should be removed
import { BaseMapsVisualizationProvider } from '../../tile_map/public/base_maps_visualization';

export function createRegionMapVisualization({ serviceSettings, $injector, uiSettings }) {
  const BaseMapsVisualization = new BaseMapsVisualizationProvider(serviceSettings);
  const tooltipFormatter = new TileMapTooltipFormatter($injector);

  return class RegionMapsVisualization extends BaseMapsVisualization {
    constructor(container, vis) {
      super(container, vis);
      this._vis = this.vis;
      this._choroplethLayer = null;
    }

    async render(esResponse, visParams, status) {
      await super.render(esResponse, visParams, status);
      if (this._choroplethLayer) {
        await this._choroplethLayer.whenDataLoaded();
      }
    }

    async _updateData(table) {
      this._chartData = table;
      const termColumn = this._params.bucket ? table.columns[this._params.bucket.accessor] : null;
      const valueColumn = table.columns[this._params.metric.accessor];
      let results;
      if (!this._hasColumns() || !table.rows.length) {
        results = [];
      } else {
        results = table.rows.map(row => {
          const term = row[termColumn.id];
          const value = row[valueColumn.id];
          return { term: term, value: value };
        });
      }

      if (!this._params.selectedJoinField && this._params.selectedLayer) {
        this._params.selectedJoinField = this._params.selectedLayer.fields[0];
      }

      if (!this._params.selectedLayer) {
        return;
      }

      this._updateChoroplethLayerForNewMetrics(
        this._params.selectedLayer.name,
        this._params.selectedLayer.attribution,
        this._params.showAllShapes,
        results
      );

      const metricFieldFormatter = getFormat(this._params.metric.format);

      this._choroplethLayer.setMetrics(results, metricFieldFormatter, valueColumn.name);
      if (termColumn && valueColumn) {
        this._choroplethLayer.setTooltipFormatter(
          tooltipFormatter,
          metricFieldFormatter,
          termColumn.name,
          valueColumn.name
        );
      }

      this._kibanaMap.useUiStateFromVisualization(this._vis);
    }

    async _updateParams() {
      await super._updateParams();
      const visParams = this._params;

      if (!visParams.selectedJoinField && visParams.selectedLayer) {
        visParams.selectedJoinField = visParams.selectedLayer.fields[0];
      }

      if (!visParams.selectedJoinField || !visParams.selectedLayer) {
        return;
      }

      this._updateChoroplethLayerForNewProperties(
        visParams.selectedLayer.name,
        visParams.selectedLayer.attribution,
        this._params.showAllShapes
      );

      const metricFieldFormatter = getFormat(this._params.metric.format);

      this._choroplethLayer.setJoinField(visParams.selectedJoinField.name);
      this._choroplethLayer.setColorRamp(truncatedColorMaps[visParams.colorSchema].value);
      this._choroplethLayer.setLineWeight(visParams.outlineWeight);
      this._choroplethLayer.setTooltipFormatter(
        tooltipFormatter,
        metricFieldFormatter,
        this._metricLabel
      );
    }

    _updateChoroplethLayerForNewMetrics(name, attribution, showAllData, newMetrics) {
      if (
        this._choroplethLayer &&
        this._choroplethLayer.canReuseInstanceForNewMetrics(name, showAllData, newMetrics)
      ) {
        return;
      }
      return this._recreateChoroplethLayer(name, attribution, showAllData);
    }

    _updateChoroplethLayerForNewProperties(name, attribution, showAllData) {
      if (this._choroplethLayer && this._choroplethLayer.canReuseInstance(name, showAllData)) {
        return;
      }
      return this._recreateChoroplethLayer(name, attribution, showAllData);
    }

    _recreateChoroplethLayer(name, attribution, showAllData) {
      this._kibanaMap.removeLayer(this._choroplethLayer);

      if (this._choroplethLayer) {
        this._choroplethLayer = this._choroplethLayer.cloneChoroplethLayerForNewData(
          name,
          attribution,
          this._params.selectedLayer.format,
          showAllData,
          this._params.selectedLayer.meta,
          this._params.selectedLayer,
          serviceSettings
        );
      } else {
        this._choroplethLayer = new ChoroplethLayer(
          name,
          attribution,
          this._params.selectedLayer.format,
          showAllData,
          this._params.selectedLayer.meta,
          this._params.selectedLayer,
          serviceSettings
        );
      }

      this._choroplethLayer.on('select', event => {
        const rowIndex = this._chartData.rows.findIndex(row => row[0] === event);
        this._vis.API.events.filter({
          table: this._chartData,
          column: 0,
          row: rowIndex,
          value: event,
        });
      });

      this._choroplethLayer.on('styleChanged', event => {
        const shouldShowWarning =
          this._params.isDisplayWarning && uiSettings.get('visualization:regionmap:showWarnings');
        if (event.mismatches.length > 0 && shouldShowWarning) {
          toastNotifications.addWarning({
            title: i18n.translate('regionMap.visualization.unableToShowMismatchesWarningTitle', {
              defaultMessage:
                'Unable to show {mismatchesLength} {oneMismatch, plural, one {result} other {results}} on map',
              values: {
                mismatchesLength: event.mismatches.length,
                oneMismatch: event.mismatches.length > 1 ? 0 : 1,
              },
            }),
            text: i18n.translate('regionMap.visualization.unableToShowMismatchesWarningText', {
              defaultMessage:
                "Ensure that each of these term matches a shape on that shape's join field: {mismatches}",
              values: {
                mismatches: event.mismatches ? event.mismatches.join(', ') : '',
              },
            }),
          });
        }
      });

      this._kibanaMap.addLayer(this._choroplethLayer);
    }

    _hasColumns() {
      return this._chartData && this._chartData.columns.length === 2;
    }
  };
}
