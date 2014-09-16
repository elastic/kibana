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

      // Returns an array of unique chart labels
      return getArrOfUniqLabels(getArr(obj));
    };
  };
});
