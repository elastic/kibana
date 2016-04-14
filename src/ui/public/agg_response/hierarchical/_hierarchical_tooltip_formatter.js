define(function (require) {
  return function HierarchicalTooltipFormaterProvider($rootScope, $compile, $sce) {
    let _ = require('lodash');
    let $ = require('jquery');
    let $tooltip = $(require('ui/agg_response/hierarchical/_tooltip.html'));
    let collectBranch = require('ui/agg_response/hierarchical/_collect_branch');
    let $tooltipScope = $rootScope.$new();
    let numeral = require('numeral');

    $compile($tooltip)($tooltipScope);

    return function (columns) {
      return function (event) {
        let datum = event.datum;

        // Collect the current leaf and parents into an array of values
        $tooltipScope.rows = collectBranch(datum);

        let metricCol = $tooltipScope.metricCol = _.find(columns, { categoryName: 'metric' });

        // Map those values to what the tooltipSource.rows format.
        _.forEachRight($tooltipScope.rows, function (row, i, rows) {
          row.spacer = $sce.trustAsHtml(_.repeat('&nbsp;', row.depth));

          let percent;
          if (row.item.percentOfGroup != null) {
            percent = row.item.percentOfGroup;
          }

          row.metric = metricCol.aggConfig.fieldFormatter()(row.metric);

          if (percent != null) {
            row.metric += ' (' + numeral(percent).format('0.[00]%') + ')';
          }

          return row;
        });

        $tooltipScope.$apply();
        return $tooltip[0].outerHTML;
      };

    };

  };
});
