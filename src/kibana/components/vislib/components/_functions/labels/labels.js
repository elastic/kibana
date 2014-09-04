define(function (require) {
  return function LabelUtilService(Private) {
    var getArr = Private(require('components/vislib/components/_functions/labels/data_array'));
    var getArrOfUniqLabels = Private(require('components/vislib/components/_functions/labels/uniq_labels'));

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
      if (!obj instanceof Object) {
        throw new Error(obj + ' should be an object');
      }

      // Returns an array of unique chart labels
      return getArrOfUniqLabels(getArr(obj));
    };
  };
});
