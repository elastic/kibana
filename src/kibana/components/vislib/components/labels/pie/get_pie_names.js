define(function (require) {
  var _ = require('lodash');

  return function GetPieNames(Private) {
    var returnNames = Private(require('components/vislib/components/labels/pie/return_pie_names'));

    return function (data, columns) {
      var slices = data.slices;

      if (slices.children) {
        var namedObj = returnNames(slices.children, 0, columns);

        return _(namedObj)
          .sortBy(function (obj) {
            return obj.index;
          })
          .pluck('key')
          .unique()
          .value();
      }
    };
  };
});