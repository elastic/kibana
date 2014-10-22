define(function (require) {
  return function HierarchialTooltipFormaterProvider($rootScope, $compile, $sce) {
    var _ = require('lodash');
    var $ = require('jquery');
    var $tooltip = $(require('text!components/vis_types/tooltips/pie.html'));
    var $tooltipScope = $rootScope.$new();
    $compile($tooltip)($tooltipScope);

    return function (columns) {
      return function (event) {
        var datum = event.point;
        var parent;
        var sum;

        // the sum of values at all levels/generations is the same, but levels
        // are seperated by their parents so the root is the simplest to find
        for (parent = datum; parent; parent = parent.parent) {
          sum = parent.value;
        }

        var rows = $tooltipScope.rows = [];

        // walk up the branch for each parent
        (function walk(item) {
          // record the the depth
          var i = item.depth - 1;

          // Using the aggConfig determin what the field name is. If the aggConfig
          // doesn't exist (which means it's an _all agg) then use the level for
          // the field name
          var col = item.aggConfig;
          var field = (col && col.params && col.params.field && col.params.field.name)
            || (col && col.label)
            || ('level ' + datum.depth);

          // Set the bucket name, and use the converter to format the field if
          // the field exists.
          var bucket = item.name;
          if (col && col.field) bucket = col.field.format.convert(bucket);

          // Add the row to the tooltipScope.rows
          rows.unshift({
            spacer: $sce.trustAsHtml(_.repeat('&nbsp;', i)),
            field: field,
            bucket: bucket,
            metric: item.value + ' (' + Math.round((item.value / sum) * 100) + '%)'
          });

          // If the item has a parent and it's also a child then continue walking
          // up the branch
          if (item.parent && item.parent.parent) {
            walk(item.parent);
          }
        })(datum);

        $tooltipScope.metricCol = _.find(columns, { categoryName: 'metric' });

        $tooltipScope.$apply();
        return $tooltip[0].outerHTML;
      };

    };

  };
});
