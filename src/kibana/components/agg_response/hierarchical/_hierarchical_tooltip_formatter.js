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
        var rows = collectBranch(datum);

        // Map those values to what the tooltipSource.rows format.
        $tooltipScope.rows = _.map(rows, function (row) {
          row.spacer = $sce.trustAsHtml(_.repeat('&nbsp;', row.depth));
          if (row.item.percentOfGroup) {
            row.metric += ' (' + numeral(row.item.percentOfGroup).format('0.[00]%') + ')';
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
