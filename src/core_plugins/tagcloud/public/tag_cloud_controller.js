import { uiModules } from 'ui/modules';
import TagCloud from 'plugins/tagcloud/tag_cloud';
import AggConfigResult from 'ui/vis/agg_config_result';

const module = uiModules.get('kibana/tagcloud', ['kibana']);
module.controller('KbnTagCloudController', function ($scope, $element) {

  const containerNode = $element[0];
  const maxTagCount = 200;
  let truncated = false;
  let bucketAgg;

  const tagCloud = new TagCloud(containerNode);
  tagCloud.on('select', (event) => {
    if (!bucketAgg) return;
    const aggConfigResult = new AggConfigResult(bucketAgg, false, event, event);
    $scope.vis.API.events.filter({ point: { aggConfigResult: aggConfigResult } });
    $scope.$apply();
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

    if (!response || !response.tables.length) {
      tagCloud.setData([]);
      return;
    }

    const data = response.tables[0];
    bucketAgg = data.columns[0].aggConfig;

    const tags = data.rows.map(row => {
      const [tag, count] = row;
      return {
        displayText: bucketAgg ? bucketAgg.fieldFormatter()(tag) : tag,
        rawText: tag,
        value: count
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

});
