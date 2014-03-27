define(function (require) {
  var _ = require('lodash');

  require('modules')
    .get('kibana/services')
    .service('state', function ($location) {
      this.set = function (state) {
        var search = $location.search();
        search._r = rison.encode(state);
        $location.search(search);
        return search;
      };

      this.get = function () {
        var search = $location.search();
        return _.isUndefined(search._r) ? {} : rison.decode(search._r);
      };
    });
});