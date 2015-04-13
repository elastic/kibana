define(function (require) {
  var d3 = require('d3');
  /**
   * Creates a string based on the hex color passed in
   *
   * @method colorToClass
   * @param d {Object} d3 object
   * @returns {string} label value
   */
  function dataLabel(selection, label) {
    d3.select(selection).attr('data-label', label);
  }

  return dataLabel;
});