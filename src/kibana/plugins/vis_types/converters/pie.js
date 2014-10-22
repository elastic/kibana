define(function (require) {
  return function HistogramConverterFn(Private, timefilter, $compile, $rootScope, $sce) {
    var _ = require('lodash');
    var $ = require('jquery');
    var moment = require('moment');
    var interval = require('utils/interval');

    var $tooltip = $(require('text!plugins/vis_types/tooltips/pie.html'));
    var $tooltipScope = $rootScope.$new();
    $compile($tooltip)($tooltipScope);

    return function (chart, columns, rows) {

      // Checks for obj.parent.name and
      // Returns an array of parent names
      // if they exist.
      function checkForParentName(datum) {
        var parentNames = [];

        parentNames.push(datum.name);

        if (datum.parent.name) {
          _.forEach(checkForParentName(datum.parent), function (name) {
            return parentNames.push(name);
          });
        }

        return parentNames;
      }

      // tooltip formatter for pie charts
      chart.tooltipFormatter = function (event) {
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


      // TODO: refactor this code to simplify and possibly merge with data converter code below
      // Creates a collection of all the labels
      // and their index value
      var sliceLabels = {};

      rows.forEach(function (row, i) {
        var startIndex = 0;
        var stopIndex = row.length - 1;
        row = row.slice(startIndex, stopIndex);

        // if no label available, return _all
        if (row.length === 0) {
          return sliceLabels['_all'] = i;
        }

        row.forEach(function (name, i) {
          if (!sliceLabels[name]) {
            return sliceLabels[name] = i;
          }
        });
      });

      // An array of all the labels sorted by their index number
      chart.names = _(sliceLabels)
        .pairs()
        .sortBy(function (d) {
          return d[1];
        })
        .pluck(function (d) {
          return d[0];
        })
        .value();


      // Pie Data Converter
      var slices = chart.slices = {};
      var children = slices.children = [];

      // appends new object (slice) to children array
      function appendSlice(array, name) {
        return array.push({
          name: name,
          children: []
        });
      }

      rows.forEach(function (row) {
        var rowLength = row.length;

        // Name is always the second to last value in the array
        // Size is always the last value in the array
        var iName = rowLength - 2;
        var iSize = rowLength - 1;

        // Wrap up the name and size values into an object
        var datum = {
          name: (row[iName] == null && rowLength >= 2) ? row[iName - 1] : rowLength < 2 ? '_all' : row[iName],
          size: row[iSize]
        };

        // Create an array of the labels (names) that should append a slice
        // i.e. { names: '', children: [] }
        var startIndex = 0;
        var stopIndex = rowLength - 2;
        var names = (row[iName] == null) ? row.slice(startIndex, stopIndex - 1) : row.slice(startIndex, stopIndex);

        // Keep track of the current children array
        var currentArray = children;

        // For each name in the names array, append an empty slice if the
        // named object is not present, else return
        names.forEach(function (name) {
          // Find the index of the name in the current children array
          var currentNameIndex = _.findIndex(currentArray, { name: name });

          // If not present, append an empty slice
          if (currentNameIndex === -1) {
            appendSlice(currentArray, name);
          }

          // Update the current array
          currentNameIndex = _.findIndex(currentArray, { name: name });
          currentArray = currentArray[currentNameIndex].children;
        });

        // Append datum
        currentArray.push(datum);
      });
    };
  };
});
