define(function (require) {
  // get the kibana/metric_vis module, and make sure that it requires the "kibana" module if it
  // didn't already
  var module = require('modules').get('kibana/metric_vis', ['kibana']);

  module.controller('KbnMetricVisController', function ($scope, Private) {
    var tabifyAggResponse = Private(require('components/agg_response/tabify/tabify'));

    var metrics = $scope.metrics = [];
    Number.prototype.formatUnit = function (prec, dec, thousnd) {
      var n = this,
      c = (isNaN(prec = Math.abs(prec)) ? 2 : prec),
      d = (dec === undefined ? '.' : dec),
      t = (thousnd === undefined ? ',' : thousnd),
      s = (n < 0 ? '-' : ''),
      i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + '',
      j = (j = i.length) > 3 ? j % 3 : 0;
      return s + (j ? i.substr(0, j) + t : '')
          + i.substr(j).replace(/(\d{3})(?=\d)/g, '$1' + t)
          + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : '');
    };

    var customFormat = function (number) {
      var vis = $scope.vis;
      if (vis === undefined)
        return number;
      else if (vis.params.customFormat)
        return number.formatUnit($scope.vis.params.precision,
                                $scope.vis.params.decimalSep,
                                $scope.vis.params.thousandsSep)
                                + ' ' + $scope.vis.params.unit;
       else
        return number;
    };

    $scope.processTableGroups = function (tableGroups) {
      tableGroups.tables.forEach(function (table) {
        table.columns.forEach(function (column, i) {
          var fieldFormatter = table.aggConfig(column).fieldFormatter();
          metrics.push({
            label: column.title,
            value: customFormat(fieldFormatter(table.rows[0][i]))
          });
        });
      });
    };

    $scope.$watch('esResponse', function (resp) {
      if (resp) {
        metrics.length = 0;
        $scope.processTableGroups(tabifyAggResponse($scope.vis, resp));
      }
    });
  });
});