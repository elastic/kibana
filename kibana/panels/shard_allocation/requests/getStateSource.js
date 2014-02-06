define(function () {
  'use strict';
  return function ($http) {
    return function (config, obj) {
      var url = config.elasticsearch+'/'+obj._index+'/cluster_state/'+obj._id;
      return $http.get(url).then(function (resp) {
        var state;
        if (resp.data && resp.data._source) {
          state = resp.data._source;
          state._id = obj._id;
          return state;
        }
        return false;
      });
    };   
  };
});
