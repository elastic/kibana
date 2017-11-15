import { uiModules } from 'ui/modules';
import 'plugins/kbn_vislib_vis_types/controls/vislib_basic_options';
import _ from 'lodash';
import AggConfigResult from 'ui/vis/agg_config_result';
import { KibanaMap } from '../../tile_map/public/kibana_map';
import ChoroplethLayer from './choropleth_layer';
import { truncatedColorMaps }  from 'ui/vislib/components/color/truncated_colormaps';
import AggResponsePointSeriesTooltipFormatterProvider from './tooltip_formatter';
import 'ui/vis/map/service_settings';


const module = uiModules.get('kibana/region_map', ['kibana']);
module.controller('KbnRegionMapController', function ($scope, $element, Private, Notifier, getAppState,
  serviceSettings, config) {

  const DEFAULT_ZOOM_SETTINGS = {
    zoom: 2,
    mapCenter: [0, 0]
  };

  const tooltipFormatter = Private(AggResponsePointSeriesTooltipFormatterProvider);
  const notify = new Notifier({ location: 'Region map' });

  let kibanaMap = null;
  let choroplethLayer = null;
  const kibanaMapReady = makeKibanaMap();

  $scope.$watch('resize', () => {
    if (kibanaMap) {
      kibanaMap.resize();
    }
  });

  $scope.$watch('esResponse', async function (tableGroup) {
    kibanaMapReady.then(() => {

      let results;
      if (!tableGroup || !tableGroup.tables || !tableGroup.tables.length || tableGroup.tables[0].columns.length !== 2) {
        results = [];
      } else {
        const buckets = tableGroup.tables[0].rows;
        results = buckets.map(([term, value]) => { return { term: term, value: value }; });
      }

      if (!$scope.vis.params.selectedJoinField && $scope.vis.params.selectedLayer) {
        $scope.vis.params.selectedJoinField = $scope.vis.params.selectedLayer.fields[0];
      }

      if (!$scope.vis.params.selectedLayer) {
        return;
      }

      updateChoroplethLayer($scope.vis.params.selectedLayer.url, $scope.vis.params.selectedLayer.attribution);
      const metricsAgg = _.first($scope.vis.getAggConfig().bySchemaName.metric);
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

      updateChoroplethLayer(visParams.selectedLayer.url, visParams.selectedLayer.attribution);
      choroplethLayer.setJoinField(visParams.selectedJoinField.name);
      choroplethLayer.setColorRamp(truncatedColorMaps[visParams.colorSchema]);
      setTooltipFormatter();


      updateBaseLayer(visParams);


      kibanaMap.setShowTooltip(visParams.addTooltip);
      kibanaMap.setLegendPosition(visParams.legendPosition);
      kibanaMap.useUiStateFromVisualization($scope.vis);
      kibanaMap.resize();
      $element.trigger('renderComplete');
    });
  });

  async function updateBaseLayer(visParams) {
    const tmsSettings = await serviceSettings.getTMSService();
    let baseLayerOptions;
    let minMaxZoom;
    if (visParams.wms.enabled) {
      minMaxZoom = tmsSettings.getMinMaxZoom(true);
      baseLayerOptions = {
        baseLayerType: 'wms',
        options: {
          minZoom: minMaxZoom.minZoom,
          maxZoom: minMaxZoom.maxZoom,
          url: visParams.wms.url,
          ...visParams.wms.options
        }
      };
    } else {
      minMaxZoom = tmsSettings.getMinMaxZoom(false);
      const tmsUrl = tmsSettings.getUrl();
      const tmsOptions = tmsSettings.getTMSOptions();
      baseLayerOptions = { baseLayerType: 'tms', options: { tmsUrl, ...tmsOptions } };
    }
    kibanaMap.setMinZoom(minMaxZoom.minZoom);
    kibanaMap.setMaxZoom(minMaxZoom.maxZoom);
    kibanaMap.setBaseLayer(baseLayerOptions);
  }

  async function makeKibanaMap() {
    const options = {};
    const uiState = $scope.vis.getUiState();
    const zoomFromUiState = parseInt(uiState.get('mapZoom'));
    const centerFromUIState = uiState.get('mapCenter');
    options.zoom = !isNaN(zoomFromUiState) ? zoomFromUiState : DEFAULT_ZOOM_SETTINGS.zoom;
    options.center = centerFromUIState ? centerFromUIState : DEFAULT_ZOOM_SETTINGS.mapCenter;
    kibanaMap = new KibanaMap($element[0], options);
    kibanaMap.addLegendControl();
    kibanaMap.addFitControl();
    kibanaMap.persistUiStateForVisualization($scope.vis);
    await updateBaseLayer($scope.vis.params);
  }

  function setTooltipFormatter() {
    const metricsAgg = _.first($scope.vis.getAggConfig().bySchemaName.metric);
    if ($scope.vis.getAggConfig().bySchemaName.segment && $scope.vis.getAggConfig().bySchemaName.segment[0]) {
      const fieldName = $scope.vis.getAggConfig().bySchemaName.segment[0].makeLabel();
      choroplethLayer.setTooltipFormatter(tooltipFormatter, metricsAgg, fieldName);
    } else {
      choroplethLayer.setTooltipFormatter(tooltipFormatter, metricsAgg, null);
    }
  }

  function updateChoroplethLayer(url, attribution) {

    if (choroplethLayer && choroplethLayer.equalsGeoJsonUrl(url)) {//no need to recreate the layer
      return;
    }
    kibanaMap.removeLayer(choroplethLayer);

    const previousMetrics = choroplethLayer ? choroplethLayer.getMetrics() : null;
    const previousMetricsAgg = choroplethLayer ? choroplethLayer.getMetricsAgg() : null;
    choroplethLayer = new ChoroplethLayer(url, attribution);
    if (previousMetrics && previousMetricsAgg) {
      choroplethLayer.setMetrics(previousMetrics, previousMetricsAgg);
    }
    choroplethLayer.on('select', function (event) {
      const aggs = $scope.vis.getAggConfig().getResponseAggs();
      const aggConfigResult = new AggConfigResult(aggs[0], false, event, event);
      $scope.vis.API.events.filter({ point: { aggConfigResult: aggConfigResult } });
    });
    choroplethLayer.on('styleChanged', function (event) {
      const shouldShowWarning = $scope.vis.params.isDisplayWarning && config.get('visualization:regionmap:showWarnings');
      if (event.mismatches.length > 0 && shouldShowWarning) {
        notify.warning(
          `Could not show ${event.mismatches.length} ${event.mismatches.length > 1 ? 'results' : 'result'} on the map.`
          + ` To avoid this, ensure that each term can be matched to a corresponding shape on that shape's join field.`
          + ` Could not match following terms: ${event.mismatches.join(',')}`
        );
      }
    });
    kibanaMap.addLayer(choroplethLayer);
  }


});


