import { uiModules } from 'ui/modules';
import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import _ from 'lodash';
import AggConfigResult from 'ui/vis/agg_config_result';
import { KibanaMap } from 'ui/vis_maps/kibana_map';
import ChoroplethLayer from './choropleth_layer';
import { truncatedColorMaps }  from 'ui/vislib/components/color/truncated_colormaps';
import AggResponsePointSeriesTooltipFormatterProvider from './tooltip_formatter';
import { ResizeCheckerProvider } from 'ui/resize_checker';
import 'ui/vis_maps/lib/service_settings';


const module = uiModules.get('kibana/region_map', ['kibana']);
module.controller('KbnRegionMapController', function ($scope, $element, Private, Notifier, getAppState,
                                                       serviceSettings, config) {

  const tooltipFormatter = Private(AggResponsePointSeriesTooltipFormatterProvider);
  const ResizeChecker = Private(ResizeCheckerProvider);
  const notify = new Notifier({ location: 'Region map' });
  const resizeChecker = new ResizeChecker($element);

  let kibanaMap = null;
  resizeChecker.on('resize', () => {
    if (kibanaMap) {
      kibanaMap.resize();
    }
  });
  let choroplethLayer = null;
  const kibanaMapReady = makeKibanaMap();

  $scope.$watch('esResponse', async function (response) {
    kibanaMapReady.then(() => {
      const metricsAgg = _.first($scope.vis.aggs.bySchemaName.metric);
      const termAggId = _.first(_.pluck($scope.vis.aggs.bySchemaName.segment, 'id'));

      let results;
      if (!response || !response.aggregations) {
        results = [];
      } else {
        const buckets = response.aggregations[termAggId].buckets;
        results = buckets.map((bucket) => {
          return {
            term: bucket.key,
            value: metricsAgg.getValue(bucket)
          };
        });
      }

      if (!$scope.vis.params.selectedJoinField && $scope.vis.params.selectedLayer) {
        $scope.vis.params.selectedJoinField = $scope.vis.params.selectedLayer.fields[0];
      }

      if (!$scope.vis.params.selectedLayer) {
        return;
      }

      updateChoroplethLayer($scope.vis.params.selectedLayer.url);
      choroplethLayer.setMetrics(results, metricsAgg);
      setTooltipFormatter();

      kibanaMap.useUiStateFromVisualization($scope.vis);
      kibanaMap.resize();
      $element.trigger('renderComplete');
    });
  });

  $scope.$watch('vis.params', (visParams) => {
    kibanaMapReady.then(() => {
      if (!visParams.selectedJoinField && visParams.selectedLayer) {
        visParams.selectedJoinField = visParams.selectedLayer.fields[0];
      }

      if (!visParams.selectedJoinField || !visParams.selectedLayer) {
        return;
      }

      updateChoroplethLayer(visParams.selectedLayer.url);
      choroplethLayer.setJoinField(visParams.selectedJoinField.name);
      choroplethLayer.setColorRamp(truncatedColorMaps[visParams.colorSchema]);
      setTooltipFormatter();

      kibanaMap.setShowTooltip(visParams.addTooltip);
      kibanaMap.setLegendPosition(visParams.legendPosition);
      kibanaMap.useUiStateFromVisualization($scope.vis);
      kibanaMap.resize();
      $element.trigger('renderComplete');
    });
  });

  async function makeKibanaMap() {
    const tmsSettings = await serviceSettings.getTMSService();
    const minMaxZoom = tmsSettings.getMinMaxZoom(false);
    kibanaMap = new KibanaMap($element[0], minMaxZoom);
    const url = tmsSettings.getUrl();
    const options = tmsSettings.getTMSOptions();
    kibanaMap.setBaseLayer({ baseLayerType: 'tms', options: { url, ...options } });
    kibanaMap.addLegendControl();
    kibanaMap.addFitControl();
    kibanaMap.persistUiStateForVisualization($scope.vis);
  }

  function setTooltipFormatter() {
    const metricsAgg = _.first($scope.vis.aggs.bySchemaName.metric);
    if ($scope.vis.aggs.bySchemaName.segment && $scope.vis.aggs.bySchemaName.segment[0]) {
      const fieldName = $scope.vis.aggs.bySchemaName.segment[0].makeLabel();
      choroplethLayer.setTooltipFormatter(tooltipFormatter, metricsAgg, fieldName);
    } else {
      choroplethLayer.setTooltipFormatter(tooltipFormatter, metricsAgg, null);
    }
  }

  function updateChoroplethLayer(url) {

    if (choroplethLayer && choroplethLayer.equalsGeoJsonUrl(url)) {//no need to recreate the layer
      return;
    }
    kibanaMap.removeLayer(choroplethLayer);

    const previousMetrics = choroplethLayer ? choroplethLayer.getMetrics() : null;
    const previousMetricsAgg = choroplethLayer ? choroplethLayer.getMetricsAgg() : null;
    choroplethLayer = new ChoroplethLayer(url);
    if (previousMetrics && previousMetricsAgg) {
      choroplethLayer.setMetrics(previousMetrics, previousMetricsAgg);
    }
    choroplethLayer.on('select', function (event) {
      const aggs = $scope.vis.aggs.getResponseAggs();
      const aggConfigResult = new AggConfigResult(aggs[0], false, event, event);
      $scope.vis.listeners.click({ point: { aggConfigResult: aggConfigResult } });
    });
    choroplethLayer.on('styleChanged', function (event) {
      if (event.mismatches.length > 0 && config.get('visualization:regionmap:showWarnings')) {
        notify.warning(
          `Could not show ${event.mismatches.length} ${event.mismatches.length > 1 ? 'results' : 'result'} on the map.`
            + ` To avoid this, ensure that each term can be joined to a corresponding shape on that shape's join field.`
          + ` Could not join following terms: ${event.mismatches.join(',')}`
        );
      }
    });
    kibanaMap.addLayer(choroplethLayer);
  }


});


