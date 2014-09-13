define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  var qs = require('utils/query_string');
  var rison = require('utils/rison');

  var module = require('modules').get('kibana/global_state');

  module.service('globalState', function (Private, $rootScope, $location) {
    var State = Private(require('components/state_management/state'));

    _(GlobalState).inherits(State);
    function GlobalState(defaults) {
      GlobalState.Super.call(this, '_g', defaults);
    }

    GlobalState.prototype.writeToUrl = function (url) {
      return qs.replaceParamInUrl(url, this._urlParam, this.toRISON());
    };

    GlobalState.prototype._readFromURL = function (method) {
      var search = $location.search();
      if (method === 'fetch') {
        return (search[this._urlParam]) ? rison.decode(search[this._urlParam]) : this.toObject();
      }
      return rison.decode(search[this._urlParam] || '()');
    };

    return new GlobalState();
  });
});
