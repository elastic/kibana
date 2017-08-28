import _ from 'lodash';
import { uiModules } from 'ui/modules';
import TagCloud from 'plugins/tagcloud/tag_cloud';
import AggConfigResult from 'ui/vis/agg_config_result';
import { FilterBarClickHandlerProvider } from 'ui/filter_bar/filter_bar_click_handler';

const module = uiModules.get('kibana/tagcloud', ['kibana']);
module.controller('KbnTagCloudController', function ($scope, $element, Private, getAppState) {

  const containerNode = $element[0];
  const filterBarClickHandler = Private(FilterBarClickHandlerProvider);
  const maxTagCount = 200;
  let truncated = false;

  const tagCloud = new TagCloud(containerNode);
  tagCloud.on('select', (event) => {
    const appState = getAppState();
    const clickHandler = filterBarClickHandler(appState);
    const aggs = $scope.vis.getAggConfig().getResponseAggs();
    const aggConfigResult = new AggConfigResult(aggs[0], false, event, event);
    clickHandler({ point: { aggConfigResult: aggConfigResult } });
  });

  tagCloud.on('renderComplete', () => {

    const truncatedMessage = containerNode.querySelector('.tagcloud-truncated-message');
    const incompleteMessage = containerNode.querySelector('.tagcloud-incomplete-message');

    if (!$scope.vis.aggs[0] || !$scope.vis.aggs[1]) {
      incompleteMessage.style.display = 'none';
      truncatedMessage.style.display = 'none';
      return;
    }

    const bucketName = containerNode.querySelector('.tagcloud-custom-label');
    bucketName.innerHTML = `${$scope.vis.aggs[0].makeLabel()} - ${$scope.vis.aggs[1].makeLabel()}`;
    truncatedMessage.style.display = truncated ? 'block' : 'none';

    const status = tagCloud.getStatus();
    if (TagCloud.STATUS.COMPLETE === status) {
      incompleteMessage.style.display = 'none';
    } else if (TagCloud.STATUS.INCOMPLETE === status) {
      incompleteMessage.style.display = 'block';
    }


    $scope.renderComplete();
  });

  $scope.$watch('esResponse', async function (response) {

    if (!response) {
      tagCloud.setData([]);
      return;
    }

    const tagsAggId = _.first(_.pluck($scope.vis.getAggConfig().bySchemaName.segment, 'id'));
    if (!tagsAggId || !response.aggregations) {
      tagCloud.setData([]);
      return;
    }

    const metricsAgg = _.first($scope.vis.getAggConfig().bySchemaName.metric);
    const buckets = response.aggregations[tagsAggId].buckets;

    const tags = buckets.map((bucket) => {
      return {
        text: bucket.key,
        value: getValue(metricsAgg, bucket)
      };
    });


    if (tags.length > maxTagCount) {
      tags.length = maxTagCount;
      truncated = true;
    } else {
      truncated = false;
    }

    tagCloud.setData(tags);
  });


  $scope.$watch('vis.params', (options) => tagCloud.setOptions(options));

  $scope.$watch('resize', () => {
    tagCloud.resize();
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


});
