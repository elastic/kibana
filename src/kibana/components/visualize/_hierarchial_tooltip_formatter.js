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
        for (parent = datum; parent.parent; parent = parent.parent) {
          var i = parent.depth - 1;
          var col = columns[i];

          // field/agg details
          var group = (col.field && col.field.name) || col.label || ('level ' + datum.depth);

          // field value that defines the bucket
          var bucket = parent.name;
          if (col.field) bucket = col.field.format.convert(bucket);

          // metric for the bucket
          var val = parent.value;

          rows.unshift({
            spacer: $sce.trustAsHtml(_.repeat('&nbsp;', i)),
            field: group,
            bucket: bucket,
            metric: val + ' (' + Math.round((parent.value / sum) * 100) + '%)'
          });
        }

        $tooltipScope.metricCol = _.find(columns, { categoryName: 'metric' });

        $tooltipScope.$apply();
        return $tooltip[0].outerHTML;
      };

    };

  };
});
