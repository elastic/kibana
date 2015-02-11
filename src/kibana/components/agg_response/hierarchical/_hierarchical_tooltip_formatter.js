define(function (require) {
  return function HierarchicalTooltipFormaterProvider($rootScope, $compile, $sce) {
    var _ = require('lodash');
    var $ = require('jquery');
    var $tooltip = $(require('text!components/agg_response/hierarchical/_tooltip.html'));
    var collectBranch = require('components/agg_response/hierarchical/_collect_branch');
    var $tooltipScope = $rootScope.$new();
    var numeral = require('numeral');

    $compile($tooltip)($tooltipScope);

    return function (columns) {
      return function (event) {
        var datum = event.datum;

        // Collect the current leaf and parents into an array of values
        $tooltipScope.rows = collectBranch(datum);

        // Map those values to what the tooltipSource.rows format.
        _.forEachRight($tooltipScope.rows, function (row, i, rows) {
          row.spacer = $sce.trustAsHtml(_.repeat('&nbsp;', row.depth));

          var percent;
          if (i > 0) {
            var parentMetric = rows[i - 1].metric;
            percent = row.metric / parentMetric;
          }
          else if (row.item.percentOfGroup != null) {
            percent = row.item.percentOfGroup;
          }

          if (percent != null) {
            row.metric += ' (' + numeral(percent).format('0.[00]%') + ')';
          }

          return row;
        });

        $tooltipScope.metricCol = _.find(columns, { categoryName: 'metric' });

        $tooltipScope.$apply();
        return $tooltip[0].outerHTML;
      };

    };

  };
});
