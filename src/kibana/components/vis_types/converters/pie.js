define(function (require) {
  return function HistogramConverterFn(Private, timefilter) {
    var _ = require('lodash');
    var moment = require('moment');
    var interval = require('utils/interval');

    return function (chart, columns, rows) {

      // index of the slice label with the value
      var iX = _.findLastIndex(columns, { categoryName: 'segment'});
      // when we don't have an x-axis, just push everything into '_all'
      if (iX === -1) {
        iX = columns.push({
          label: ''
        }) - 1;
      }

      // index of the slice size (value)
      var iY = _.findIndex(columns, { categoryName: 'metric'});

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

      // setup the formatter for the label
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

      var slices = chart.slices = {};
      var children = slices.children = [];

      // appends new object (slice) to children array
      function appendSlice(array, name) {
        return array.push({
          name: name,
          children: []
        });
      }

      // TODO: cleanup code, simplify and document
      rows.forEach(function (row) {
        var rowLength = row.length;

        // Outer slice values
        var datum = {
          name: (row[iX] == null) ? '_all' : row[iX],
          size: row[iY === -1 ? row.length - 1 : iY]
        };

        // Create an array of the labels that should append a slice
        var startIndex = 0;
        var stopIndex = rowLength - 2;
        var names = row.slice(startIndex, stopIndex);
        var namesLength = names.length - 1;

        // Keep track of the current children array and slice name
        var currentArray = children;
        var prevName;

        // For each name in the names array, append an empty slice if the
        // named object is not present, else return
        names.forEach(function (name, i) {
          var prevNameIndex;
          var currentNameIndex;

          if (!prevName) {
            // Find the index of the name within the top-most children array
            currentNameIndex = _.findIndex(currentArray, { name: name });

            // if the named object is not present, append a new slice
            if (currentNameIndex === -1) {
              appendSlice(currentArray, name);
            }
          } else {
            // Get the previous named object index
            prevNameIndex = _.findIndex(currentArray, {name: prevName});

            // Update the current children array
            currentArray = currentArray[prevNameIndex].children;

            // Get current named object index
            currentNameIndex = _.findIndex(currentArray, { name: name });

            // if current named object does not exist, append a new slice
            if (currentNameIndex === -1) {
              appendSlice(currentArray, name);
            }
          }

          // Once we've reached the last value in the names array,
          // find the index of the last named object and append the
          // datum to its children array
          if (i === namesLength) {
            currentNameIndex = _.findIndex(currentArray, { name: name });
            currentArray[currentNameIndex].children.push(datum);
          }

          // Set prevName to the current Name
          prevName = name;
        });

        // Creates a simple pie chart
        //
        if (names.length === 0) {
          children.push(datum);
        }
      });

    };
  };
});
