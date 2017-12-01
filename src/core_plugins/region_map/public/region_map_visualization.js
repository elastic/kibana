import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import _ from 'lodash';
import AggConfigResult from 'ui/vis/agg_config_result';
import { BaseMapsVisualizationProvider } from '../../tile_map/public/base_maps_visualization';
import ChoroplethLayer from './choropleth_layer';
import { truncatedColorMaps }  from 'ui/vislib/components/color/truncated_colormaps';
import AggResponsePointSeriesTooltipFormatterProvider from './tooltip_formatter';
import 'ui/vis/map/service_settings';

export function RegionMapsVisualizationProvider(Private, Notifier, config) {

  const tooltipFormatter = Private(AggResponsePointSeriesTooltipFormatterProvider);
  const BaseMapsVisualization = Private(BaseMapsVisualizationProvider);

  return class RegionMapsVisualization extends BaseMapsVisualization {

    constructor(container, vis) {
      super(container, vis);
      this._vis = this.vis;
      this._choroplethLayer = null;
      this._notify = new Notifier({ location: 'Region map' });
    }


    async render(esReponse, status) {
      await super.render(esReponse, status);

      await this._choroplethLayer.whenDataLoaded();
    }


    async _updateData(tableGroup) {

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

      this._updateChoroplethLayer(this._vis.params.selectedLayer.url, this._vis.params.selectedLayer.attribution);
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

      this._updateChoroplethLayer(visParams.selectedLayer.url, visParams.selectedLayer.attribution);
      this._choroplethLayer.setJoinField(visParams.selectedJoinField.name);
      this._choroplethLayer.setColorRamp(truncatedColorMaps[visParams.colorSchema]);
      this._setTooltipFormatter();

    }

    _updateChoroplethLayer(url, attribution) {

      if (this._choroplethLayer && this._choroplethLayer.equalsGeoJsonUrl(url)) {//no need to recreate the layer
        return;
      }

      this._kibanaMap.removeLayer(this._choroplethLayer);

      const previousMetrics = this._choroplethLayer ? this._choroplethLayer.getMetrics() : null;
      const previousMetricsAgg = this._choroplethLayer ? this._choroplethLayer.getMetricsAgg() : null;
      this._choroplethLayer = new ChoroplethLayer(url, attribution);
      if (previousMetrics && previousMetricsAgg) {
        this._choroplethLayer.setMetrics(previousMetrics, previousMetricsAgg);
      }
      this._choroplethLayer.on('select', (event) => {
        const aggs = this._vis.getAggConfig().getResponseAggs();
        const aggConfigResult = new AggConfigResult(aggs[0], false, event, event);
        this._vis.API.events.filter({ point: { aggConfigResult: aggConfigResult } });
      });
      this._choroplethLayer.on('styleChanged', (event) => {
        const shouldShowWarning = this._vis.params.isDisplayWarning && config.get('visualization:regionmap:showWarnings');
        if (event.mismatches.length > 0 && shouldShowWarning) {
          this._notify.warning(`Could not show ${event.mismatches.length} ${event.mismatches.length > 1 ? 'results' : 'result'} on the map.`
            + ` To avoid this, ensure that each term can be matched to a corresponding shape on that shape's join field.`
            + ` Could not match following terms: ${event.mismatches.join(',')}`
          );
        }
      });
      this._kibanaMap.addLayer(this._choroplethLayer);
    }


    _setTooltipFormatter() {
      const metricsAgg = _.first(this._vis.getAggConfig().bySchemaName.metric);
      if (this._vis.getAggConfig().bySchemaName.segment && this._vis.getAggConfig().bySchemaName.segment[0]) {
        const fieldName = this._vis.getAggConfig().bySchemaName.segment[0].makeLabel();
        this._choroplethLayer.setTooltipFormatter(tooltipFormatter, metricsAgg, fieldName);
      } else {
        this._choroplethLayer.setTooltipFormatter(tooltipFormatter, metricsAgg, null);
      }
    }

  };

}
