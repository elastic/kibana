define(function (require) {
  return function HistogramConverterFn(Private, timefilter) {
    var _ = require('lodash');
    var moment = require('moment');
    var interval = require('utils/interval');

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
      chart.tooltipFormatter = function (datapoint) {
        var datum = _.clone(datapoint);

        if (datum.parent) {
          datum.value += ' per ' + datum.parent.value;
        }

        var out = datum.name ? datum.name + '<br/>' : '';

        // Add parent name if exists
        if (datum.parent.name) {
          var parentNames = checkForParentName(datum.parent);

          _.forEach(parentNames, function (name) {
            return out += name + '<br/>';
          });
        }

        out += datum.value;

        return out;
      };


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
          name: (row[iName] == null) ? '_all' : row[iName],
          size: row[iSize]
        };

        // Create an array of the labels (names) that should append a slice
        // i.e. { names: '', children: [] }
        var startIndex = 0;
        var stopIndex = rowLength - 2;
        var names = row.slice(startIndex, stopIndex);

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
