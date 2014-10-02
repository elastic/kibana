define(function (require) {
  var _ = require('lodash');
  var rison = require('utils/rison');

  var applyDiff = require('utils/diff_object');
  var qs = require('utils/query_string');

  return function StateProvider(Private, $rootScope, $location) {
    var Events = Private(require('factories/events'));

    _(State).inherits(Events);
    function State(urlParam, defaults) {
      State.Super.call(this);

      var self = this;
      self._defaults = defaults || {};
      self._urlParam = urlParam || '_s';

      // When the URL updates we need to fetch the values from the URL
      self._cleanUpListeners = _.partial(_.callEach, [
        // partial route update, no app reload
        $rootScope.$on('$routeUpdate', function () {
          self.fetch();
        }),

        // begining of full route update, new app will be initialized before
        // $routeChangeSuccess or $routeChangeError
        $rootScope.$on('$routeChangeStart', function () {
          if (self._persistAcrossApps) {
            self.fetch();
          } else {
            self.destroy();
          }
        })
      ]);

      // Initialize the State with fetch
      self.fetch();
    }

    State.prototype._readFromURL = function () {
      var search = $location.search();
      return search[this._urlParam] ? rison.decode(search[this._urlParam]) : null;
    };

    /**
     * Fetches the state from the url
     * @returns {void}
     */
    State.prototype.fetch = function () {
      var stash = this._readFromURL();

      // nothing to read from the url?
      // we should save if were are ordered to persist
      if (stash === null) {
        if (this._persistAcrossApps) {
          return this.save();
        } else {
          stash = {};
        }
      }

      _.defaults(stash, this._defaults);
      // apply diff to state from stash, will change state in place via side effect
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
      var stash = this._readFromURL();
      var state = this.toObject();
      var replace = false;

      if (!stash) {
        replace = true;
        stash = {};
      }

      _.defaults(state, this._defaults);
      // apply diff to state from stash, will change state in place via side effect
      var diffResults = applyDiff(stash, state);

      if (diffResults.keys.length) {
        this.emit('save_with_changes', diffResults.keys);
      }

      // persist the state in the URL
      var search = $location.search();
      search[this._urlParam] = this.toRISON();
      if (replace) {
        $location.search(search).replace();
      } else {
        $location.search(search);
      }
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
     * Cleans up the state object
     * @returns {void}
     */
    State.prototype.destroy = function () {
      this.off(); // removes all listners
      this._cleanUpListeners(); // Removes the $routeUpdate listner
    };

    return State;

  };

});
