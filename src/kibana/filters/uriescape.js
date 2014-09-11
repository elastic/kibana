define(function (require) {
  require('modules')
    .get('kibana')
    .filter('uriescape', function () {
      return function (str) {
        return encodeURIComponent(str);
      };
    });
});