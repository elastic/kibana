define(function (require) {
  return function LabelUtilService(Private) {
    var _ = require('lodash');

    var createArr = Private(require('components/vislib/components/labels/data_array'));
    var getArrOfUniqLabels = Private(require('components/vislib/components/labels/uniq_labels'));

    /*
     * Accepts a Kibana data object and returns an array of unique labels (strings).
     * Extracts the field formatter from the raw object and passes it to the
     * getArrOfUniqLabels function.
     *
     * Currently, this service is only used for vertical bar charts and line charts.
     */

    return function (obj) {
      if (!_.isObject(obj)) {
        throw new TypeError('LabelUtil expects an object');
      }

      return getArrOfUniqLabels(createArr(obj));
    };
  };
});
