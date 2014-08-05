define(function (require) {
  var _ = require('lodash');
  var rison = require('utils/rison');

  var applyDiff = require('utils/diff_object');

  return function StateProvider(Private, $rootScope, $location) {
    var Events = Private(require('factories/_events'));

    _.inherits(State, Events);
    function State(urlParam, defaults) {
      State.Super.call(this);
      this._defaults = defaults || {};
      this._urlParam = urlParam || '_s';

      // When the URL updates we need to fetch the values from the URL
      this._deregisterRouteUpdate = $rootScope.$on('$routeUpdate', _.bindKey(this, 'fetch'));

      // Initialize the State with fetch
      this.fetch();
    }

    /**
     * Fetches the state from the url
     * @returns {void}
     */
    State.prototype.fetch = function () {
      var search = $location.search();
      var stash = rison.decode(search[this._urlParam] || '()');
      _.defaults(stash, this._defaults);
      // apply diff to state from stash, this is side effecting so
      // it will change state in place.
      var diffResults = applyDiff(this, stash);
      if (diffResults.keys.length) {
        this.emit('fetch_with_changes', diffResults.keys);
      }
    };

    /**
     * Saves the state to the url
     * @returns {void}
     */
    State.prototype.save = function () {
      var search = $location.search();
      var stash = rison.decode(search[this._urlParam] || '()');
      var state = this.toObject();
      _.defaults(state, this._defaults);
      // apply diff to stash from state, this is side effecting so
      // it will change stash in place.
      var diffResults = applyDiff(stash, state);
      if (diffResults.keys.length) {
        this.emit('save_with_changes', diffResults.keys);
      }
      search[this._urlParam] = this.toRISON();
      $location.search(search);
    };

    /**
     * Resets the state to the defaults
     *
     * @returns {void}
     */
    State.prototype.reset = function () {
      // apply diff to _attributes from defaults, this is side effecting so
      // it will change the state in place.
      applyDiff(this, this._defaults);
      this.save();
    };

    /**
     * Registers a listner for updates to pulls
     * @returns {void}
     */
    State.prototype.onUpdate = function (cb) {
      this.on('fetch_with_changes', cb);
    };

    /**
     * Cleans up the state object
     * @returns {void}
     */
    State.prototype.destroy = function () {
      this.off(); // removes all listners
      this._deregisterRouteUpdate(); // Removes the $routeUpdate listner
    };

    return State;

  };

});
