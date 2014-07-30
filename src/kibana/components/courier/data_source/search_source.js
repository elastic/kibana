define(function (require) {

  return function SearchSourceFactory(Promise, Private) {
    var inherits = require('lodash').inherits;
    var _ = require('lodash');
    var errors = require('errors');
    var SourceAbstract = Private(require('components/courier/data_source/_abstract'));

    var getRootSourcePromise = new Promise(function (resolve) {
      require(['components/courier/data_source/_root_search_source'], _.compose(resolve, Private));
    });

    var FetchFailure = errors.FetchFailure;
    var RequestFailure = errors.RequestFailure;

    function SearchSource(initialState) {
      SourceAbstract.call(this, initialState);
    }
    inherits(SearchSource, SourceAbstract);

    /*****
     * PUBLIC API
     *****/

    /**
     * List of the editable state properties that turn into a
     * chainable API
     *
     * @type {Array}
     */
    SearchSource.prototype._methods = [
      'type',
      'query',
      'filter',
      'sort',
      'highlight',
      'aggs',
      'from',
      'size',
      'source'
    ];

    SearchSource.prototype.index = function (indexPattern) {
      if (indexPattern == null) return this._state.index;
      if (!indexPattern || typeof indexPattern.toIndexList !== 'function') {
        throw new TypeError('expected indexPattern to be an IndexPattern duck.');
      }

      this._state.index = indexPattern;
      return this;
    };

    SearchSource.prototype.extend = function () {
      return (new SearchSource()).inherits(this);
    };

    /**
     * Set a searchSource that this source should inherit from
     * @param  {SearchSource} searchSource - the parent searchSource
     * @return {this} - chainable
     */
    SearchSource.prototype.inherits = function (parent) {
      this._parent = parent;
      return this;
    };

    /**
     * Get the parent of this SearchSource
     * @return {Promise}
     */
    SearchSource.prototype.getParent = function () {
      var self = this;
      return getRootSourcePromise.then(function (rootSearchSource) {
        if (self._parent === false) return false;
        if (self._parent) return self._parent;
        return rootSearchSource.get();
      });
    };

    /**
     * Temporarily prevent this Search from being fetched... not a fan but it's easy
     */
    SearchSource.prototype.disable = function () {
      this._fetchDisabled = true;
    };

    /**
     * Reverse of SourceAbstract#disable(), only need to call this if source was previously disabled
     */
    SearchSource.prototype.enable = function () {
      this._fetchDisabled = false;
    };

    /******
     * PRIVATE APIS
     ******/

    /**
     * Gets the type of the DataSource
     * @return {string}
     */
    SearchSource.prototype._getType = function () {
      return 'search';
    };

    /**
     * Used to merge properties into the state within ._flatten().
     * The state is passed in and modified by the function
     *
     * @param  {object} state - the current merged state
     * @param  {*} val - the value at `key`
     * @param  {*} key - The key of `val`
     * @return {undefined}
     */
    SearchSource.prototype._mergeProp = function (state, val, key) {
      if (typeof val === 'function') {
        var source = this;
        return Promise.cast(val(this))
        .then(function (newVal) {
          return source._mergeProp(state, newVal, key);
        });
      }

      if (val == null || !key || !_.isString(key)) return;

      switch (key) {
      case 'filter':
        // user a shallow flatten to detect if val is an array, and pull the values out if it is
        state.filters = _.flatten([ state.filters || [], val ], true);
        return;
      case 'index':
      case 'type':
      case 'id':
        if (key && state[key] == null) {
          state[key] = val;
        }
        return;
      case 'source':
        key = '_source';
        /* fall through */
      default:
        state.body = state.body || {};
        // ignore if we already have a value
        if (state.body[key] == null) {
          if (key === 'query' && _.isString(val)) {
            val = { query_string: { query: val }};
          }

          state.body[key] = val;
        }
      }
    };

    return SearchSource;
  };
});
