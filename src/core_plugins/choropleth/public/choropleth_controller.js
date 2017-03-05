import uiModules from 'ui/modules';
import _ from 'lodash';
import AggConfigResult from 'ui/vis/agg_config_result';
import KibanaMap from 'ui/vis_maps/kibana_map';
import FilterBarFilterBarClickHandlerProvider from 'ui/filter_bar/filter_bar_click_handler';
import ChoroplethLayer from './choropleth_layer';
import colorramps from 'ui/vislib/components/color/colormaps';
import AggResponsePointSeriesTooltipFormatterProvider from './tooltip_formatter';
import VislibLibResizeCheckerProvider from 'ui/vislib/lib/resize_checker';

const module = uiModules.get('kibana/choropleth', ['kibana']);
module.controller('KbnChoroplethController', function ($scope, $element, Private, getAppState, tilemapSettings, vectormapsConfig, config) {

  const filterBarClickHandler = Private(FilterBarFilterBarClickHandlerProvider);
  const tooltipFormatter = Private(AggResponsePointSeriesTooltipFormatterProvider);
  const ResizeChecker = Private(VislibLibResizeCheckerProvider);

  const resizeChecker = new ResizeChecker($element);
  const containerNode = $element[0];

  let kibanaMap = null;
  resizeChecker.on('resize', () => {
    if (kibanaMap) {
      kibanaMap.resize();
    }
  });
  let choroplethLayer = null;

  async function makeKibanaMap() {

    if (!tilemapSettings.isInitialized()) {
      await tilemapSettings.loadSettings();
    }

    const minMaxZoom = tilemapSettings.getMinMaxZoom(false);
    kibanaMap = new KibanaMap(containerNode, minMaxZoom);
    const url = tilemapSettings.getUrl();
    const options = tilemapSettings.getTMSOptions();
    kibanaMap.setBaseLayer({
      baseLayerType: 'tms',
      options: { url, ...options }
    });
    kibanaMap.addLegendControl();
  }

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
            value: getValue(metricsAgg, bucket)
          };
        });
      }

      if (!$scope.vis.params.selectedJoinField) {
        $scope.vis.params.selectedJoinField = $scope.vis.params.selectedLayer.fields[0];
      }
      updateChoroplethLayer($scope.vis.params.selectedLayer.url);
      choroplethLayer.setMetrics(results, metricsAgg);
      if ($scope.vis.aggs.bySchemaName.segment[0]) {
        const fieldName = $scope.vis.aggs.bySchemaName.segment[0].params.field.name;
        choroplethLayer.setTooltipFormatter(tooltipFormatter, metricsAgg, fieldName);
      } else {
        choroplethLayer.setTooltipFormatter(tooltipFormatter, metricsAgg, null);
      }
      kibanaMap.resize();
      $element.trigger('renderComplete');
    });
  });

  $scope.$watch('vis.params', (visParams) => {
    kibanaMapReady.then(() => {
      if (!visParams.selectedJoinField) {
        visParams.selectedJoinField = visParams.selectedLayer.fields[0];
      }

      updateChoroplethLayer(visParams.selectedLayer.url);
      choroplethLayer.setJoinField(visParams.selectedJoinField.name);
      choroplethLayer.setColorRamp(colorramps[visParams.colorSchema]);

      kibanaMap.setShowTooltip(true);
      kibanaMap.resize();
      $element.trigger('renderComplete');
    });
  });

  function updateChoroplethLayer(url) {

    if (choroplethLayer && choroplethLayer.equalsGeoJsonUrl(url)) {
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
      const appState = getAppState();
      const clickHandler = filterBarClickHandler(appState);
      const aggs = $scope.vis.aggs.getResponseAggs();
      const aggConfigResult = new AggConfigResult(aggs[0], false, event, event);
      clickHandler({ point: { aggConfigResult: aggConfigResult } });
    });
    kibanaMap.addLayer(choroplethLayer);
  }
});


function getValue(metricsAgg, bucket) {
  let size = metricsAgg.getValue(bucket);
  if (typeof size !== 'number' || isNaN(size)) {
    try {
      size = bucket[1].values[0].value;//lift out first value (e.g. median aggregations return as array)
    } catch (e) {
      size = 1;//punt
    }
  }
  return size;
}

