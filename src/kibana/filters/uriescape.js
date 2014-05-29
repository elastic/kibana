define(function (require) {
  require('modules')
    .get('kbn/filters')
    .filter('uriescape', function () {
      return function (str) {
        return encodeURIComponent(str);
      };
    });
});