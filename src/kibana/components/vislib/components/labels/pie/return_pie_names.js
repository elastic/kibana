define(function () {
  return function ReturnPieNames() {
    return function returnNames(array, index, columns) {
      var names = [];

      array.forEach(function (obj) {
        var fieldFormatter = obj.aggConfig ? obj.aggConfig.fieldFormatter() : String;
        names.push({ key: fieldFormatter(obj.name), index: index });

        if (obj.children) {
          var plusIndex = index + 1;

          returnNames(obj.children, plusIndex, columns).forEach(function (namedObj) {
            names.push(namedObj);
          });
        }
      });

      return names;
    };
  };
});