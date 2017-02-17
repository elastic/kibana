import uiModules from 'ui/modules';
import _ from 'lodash';
import AggConfigResult from 'ui/vis/agg_config_result';
import KibanaMap from 'ui/vis_maps/kibana_map.js';
import FilterBarFilterBarClickHandlerProvider from 'ui/filter_bar/filter_bar_click_handler';
import colorramps from 'ui/vislib/components/color/colormaps';

const module = uiModules.get('kibana/choropleth', ['kibana']);
module.controller('KbnChoroplethController', function ($scope, $element, Private, getAppState, tilemapSettings) {

  const containerNode = $element[0];
  const kibanaMap = new KibanaMap(containerNode);
  const url = tilemapSettings.getUrl();
  const options = tilemapSettings.getTMSOptions();
  kibanaMap.setBaseLayer({
    baseLayerType: 'tms',
    options: { url, ...options }
  });

  const filterBarClickHandler = Private(FilterBarFilterBarClickHandlerProvider);

  kibanaMap.on('choropleth:select', function (event) {
    const appState = getAppState();
    const clickHandler = filterBarClickHandler(appState);
    const aggs = $scope.vis.aggs.getResponseAggs();
    const aggConfigResult = new AggConfigResult(aggs[0], false, event, event);
    clickHandler({ point: { aggConfigResult: aggConfigResult } });
  });

  $scope.$watch('esResponse', async function (response) {


    const termAggId = _.first(_.pluck($scope.vis.aggs.bySchemaName.segment, 'id'));

    let results;
    if (!response || !response.aggregations) {
      results = [];
    } else {
      const metricsAgg = _.first($scope.vis.aggs.bySchemaName.metric);
      const buckets = response.aggregations[termAggId].buckets;
      results = buckets.map((bucket) => {
        return {
          term: bucket.key,
          value: getValue(metricsAgg, bucket)
        };
      });
    }



    const options = $scope.vis.params;
    // if (!options.selectedLayer.url || !options.selectedJoinField) {
    //   console.log('invalid selection');//todo: fix this
    //   return;
    // }

    if (!options.selectedJoinField) {
      options.selectedJoinField = options.selectedLayer.fields[0];
    }

    kibanaMap.setChoroplethLayer(options.selectedLayer.url, options.selectedJoinField);
    kibanaMap.setChoroplethMetrics(results);
    kibanaMap.resize();

  });

  $scope.$watch('vis.params', (options) => {
    if (!options.selectedJoinField) {
      options.selectedJoinField = options.selectedLayer.fields[0];
    }
    kibanaMap.setChoroplethLayer(options.selectedLayer.url, options.selectedJoinField);
    kibanaMap.setChoroplethColorRamp(colorramps[options.colorSchema]);
    kibanaMap.resize();
  });

  $scope.$watch(getContainerSize, _.debounce(() => {
    kibanaMap.resize();
  }, 500, { trailing: true }), true);

  function getContainerSize() {
    return { width: $element.width(), height: $element.height() };
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

