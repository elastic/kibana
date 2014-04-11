define(function (require) {
  require('modules')
    .get('kibana/filters')
    .filter('startFrom', function () {
      return function (input, start) {
        if (!input) return [];
        start = +start; //parse to int
        return input.slice(start);
      };
    });
});