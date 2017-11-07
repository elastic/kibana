import _ from 'lodash';
import { uiModules } from 'ui/modules';
import { getHeatmapColors } from 'ui/vislib/components/color/heatmap_color';
// get the kibana/metric_vis module, and make sure that it requires the "kibana" module if it
// didn't already
const module = uiModules.get('kibana/metric_vis', ['kibana']);

module.controller('KbnMetricVisController', function ($scope, $element) {

  const metrics = $scope.metrics = [];
  let labels = [];
  let colors = [];

  const getLabels = () => {
    const config = $scope.vis.params.metric;
    const isPercentageMode = config.percentageMode;
    const colorsRange = config.colorsRange;
    const max = _.last(colorsRange).to;
    const labels = [];
    colorsRange.forEach(range => {
      const from = isPercentageMode ? Math.round(100 * range.from / max) : range.from;
      const to = isPercentageMode ? Math.round(100 * range.to / max) : range.to;
      labels.push(`${from} - ${to}`);
    });

    return labels;
  };

  const getColors = () => {
    const config = $scope.vis.params.metric;
    const invertColors = config.invertColors;
    const colorSchema = config.colorSchema;
    const colorsRange = config.colorsRange;
    const labels = getLabels();
    const colors = {};
    for (let i = 0; i < labels.length; i += 1) {
      const divider = Math.max(colorsRange.length - 1, 1);
      const val = invertColors ? 1 - i / divider : i / divider;
      colors[labels[i]] = getHeatmapColors(val, colorSchema);
    }
    return colors;
  };

  const getBucket = (val) => {
    const config = $scope.vis.params.metric;
    let bucket = _.findIndex(config.colorsRange, range => {
      return range.from <= val && range.to > val;
    });

    if (bucket === -1) {
      if (val < config.colorsRange[0].from) bucket = 0;
      else bucket = config.colorsRange.length - 1;
    }

    return bucket;
  };

  const getColor = (val) => {
    const bucket = getBucket(val);
    const label = labels[bucket];
    return colors[label];
  };

  $scope.processTableGroups = function (tableGroups) {
    const config = $scope.vis.params.metric;
    const isPercentageMode = config.percentageMode;
    const min = config.colorsRange[0].from;
    const max = _.last(config.colorsRange).to;

    tableGroups.tables.forEach(function (table) {
      let bucketAgg;

      table.columns.forEach(function (column, i) {
        const aggConfig = column.aggConfig;

        if (aggConfig && aggConfig.schema.group === 'buckets') {
          bucketAgg = aggConfig;
          return;
        }

        table.rows.forEach(row => {

          let title = column.title;
          let value = row[i];
          const color = getColor(value);

          if (isPercentageMode) {
            const percentage = Math.round(100 * (value - min) / (max - min));
            value = `${percentage}%`;
          }

          if (aggConfig) {
            if (!isPercentageMode) value = aggConfig.fieldFormatter('html')(value);
            if (bucketAgg) {
              const bucketValue = bucketAgg.fieldFormatter('text')(row[0]);
              title = `${bucketValue} - ${aggConfig.makeLabel()}`;
            } else {
              title = aggConfig.makeLabel();
            }
          }

          const shouldColor = config.colorsRange.length > 1;

          metrics.push({
            label: title,
            value: value,
            color: shouldColor && config.style.labelColor ? color : null,
            bgColor: shouldColor && config.style.bgColor ? color : null
          });
        });
      });
    });
  };

  $scope.$watch('esResponse', function (resp) {
    if (resp) {
      metrics.length = 0;
      labels.length = 0;
      colors.length = 0;
      colors = getColors();
      labels = getLabels();
      $scope.processTableGroups(resp);
      $element.trigger('renderComplete');
    }
  });
});
