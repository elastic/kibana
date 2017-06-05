import _ from 'lodash';
import $ from 'jquery';
import collectBranch from 'ui/agg_response/hierarchical/_collect_branch';
import numeral from 'numeral';

export function HierarchicalTooltipFormatterProvider($rootScope, $compile, $sce) {
  const $tooltip = $(require('ui/agg_response/hierarchical/_tooltip.html'));
  const $tooltipScope = $rootScope.$new();

  $compile($tooltip)($tooltipScope);

  return function (columns) {
    return function (event) {
      const datum = event.datum;

      // Collect the current leaf and parents into an array of values
      $tooltipScope.rows = collectBranch(datum);

      const metricCol = $tooltipScope.metricCol = _.find(columns, { categoryName: 'metric' });

      // Map those values to what the tooltipSource.rows format.
      _.forEachRight($tooltipScope.rows, function (row) {
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

}
