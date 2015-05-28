define(function (require) {
  var _ = require('lodash');

  return function ValidateVisDataFactory() {

    /**
     * Prevents missing data and null values from being passed to the vislib.
     * Missing data occurs when an array of data values is empty.
     */
    function validateVisData(data, chartType) {
      return validate(data, chartType);
    }

    /**
     * Validates the data object and if neccessary returns a modified data object.
     * @param data
     * @returns {*}
     */
    function validate(data, chartType) {
      var accessor = getAccessor(data, chartType);

      function pieConditional(d) { return d.slices.children.length; }
      function seriesConditional(d) { return d.series.length; }

      if (chartType === 'tile_map') return data;
      if (chartType === 'pie') return returnValidData(data, accessor, pieConditional);
      return returnValidData(data, accessor, seriesConditional);
    }

    /**
     * Removes empty data arrays from the data object.
     * @param data {Object} Kibana data object
     * @param accessor {String} Key to which data are attached
     * @param conditional {Function} Returns a Boolean based on a specific condition
     * @returns {*}
     */
    function returnValidData(data, accessor, conditional) {
      if (!data.rows && !data.columns) return [data].filter(conditional)[0];

      data[accessor] = data[accessor].filter(conditional);
      return data;
    }

    /**
     * Returns the object key associated with data values.
     * @param data {Object} Kibana data object
     * @returns {*}
     */
    function getAccessor(data, chartType) {
      if (!data.series && !data.slices && !data.geoJson) {
        return data.rows ? 'rows' : 'columns';
      }

      if (chartType === 'pie') return 'slices';
      if (chartType === 'tile_map') return 'geoJson';
      return 'series';
    }

    return validateVisData;
  };
});