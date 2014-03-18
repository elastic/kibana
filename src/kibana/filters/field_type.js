define(function (require) {
  require('modules')
    .get('kibana/filters')
    .filter('fieldType', function () {
      return function (arr, type) {
        return arr && arr.filter(function (field) {
          return (field.type === type);
        });
      };
    });
});