define(function (require) {
  return function SeriesDataTooltip($compile, $rootScope) {
    var $ = require('jquery');

    var $tooltipScope = $rootScope.$new();
    var $tooltip = $(require('text!plugins/vis_types/tooltips/histogram.html'));
    $compile($tooltip)($tooltipScope);

    function tooltip(chart) {
      // setup the formatter for the label
      chart.tooltipFormatter = function (event) {
        return '<p>punting for now</p>';
        // $tooltipScope.details = columns.map(function (col) {
        //   var datum = event.point;

        //   var label;
        //   var val;
        //   var percent;

        //   switch (col) {
        //   case col.x:
        //     label = 'x';
        //     val = datum.x;
        //     break;
        //   case col.y:
        //     label = 'y';
        //     val = datum.value;
        //     percent = datum.percent;
        //     break;
        //   case col.group:
        //     label = 'group';
        //     val = datum.label;
        //     break;
        //   }

        //   label = (col.aggConfig && col.aggConfig.makeLabel()) || (col.field && col.field.name) || label;
        //   if (col.field) val = col.field.format.convert(val);

        //   return {
        //     label: label,
        //     value: val,
        //     percent: percent
        //   };

        // });

        // $tooltipScope.$apply();
        // return $tooltip[0].outerHTML;
      };
    }

    return tooltip;
  };
});