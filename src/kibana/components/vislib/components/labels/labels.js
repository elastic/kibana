define(function (require) {
  return function LabelUtilService(Private) {
    var _ = require('lodash');

    var getArr = Private(require('components/vislib/components/labels/data_array'));
    var getArrOfUniqLabels = Private(require('components/vislib/components/labels/uniq_labels'));

    /* Takes a kibana data object
     * for example:
     * {
     *   labels: '',
     *   rows: [...],
     *   raw: [...],
     *   ...,
     * };
     * Data object can have a key that has rows, columns, or series.
     */
    return function (obj) {
      if (!_.isObject(obj)) {
        throw new Error('LabelUtil expects an object');
      }

      var raw;
      var fieldIndex;
      if (obj.raw) {
        raw = obj.raw.columns;
        fieldIndex = _.findIndex(raw, {'categoryName': 'group'});
      }

      var fieldFormatter = raw && raw[fieldIndex] ? raw[fieldIndex].field.format.convert : function (d) { return d; };

      // Returns an array of unique chart labels
      return getArrOfUniqLabels(getArr(obj), fieldFormatter);
    };
  };
});
