define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  var qs = require('utils/query_string');
  var rison = require('utils/rison');

  var module = require('modules').get('kibana/global_state');

  module.service('globalState', function (Private, $rootScope) {
    var State = Private(require('components/state_management/state'));

    _.inherits(GlobalState, State);
    function GlobalState(defaults) {
      GlobalState.Super.call(this, '_g', defaults);
    }

    GlobalState.prototype.writeToUrl = function (url) {
      return qs.replaceParamInUrl(url, this._urlParam, this.toRISON());
    };

    return new GlobalState();
  });
});
