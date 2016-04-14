define(function (require) {
  return function SearchSourceFactory(Promise, Private) {
    let _ = require('lodash');
    let SourceAbstract = Private(require('ui/courier/data_source/_abstract'));
    let SearchRequest = Private(require('ui/courier/fetch/request/search'));
    let SegmentedRequest = Private(require('ui/courier/fetch/request/segmented'));
    let searchStrategy = Private(require('ui/courier/fetch/strategy/search'));
    let normalizeSortRequest = Private(require('ui/courier/data_source/_normalize_sort_request'));
    let rootSearchSource = require('ui/courier/data_source/_root_search_source');

    _.class(SearchSource).inherits(SourceAbstract);
    function SearchSource(initialState) {
      SearchSource.Super.call(this, initialState, searchStrategy);
    }

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
      if (indexPattern === undefined) return this._state.index;
      if (indexPattern === null) return delete this._state.index;
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
     * @return {undefined|searchSource}
     */
    SearchSource.prototype.getParent = function (onlyHardLinked) {
      let self = this;
      if (self._parent === false) return;
      if (self._parent) return self._parent;
      return onlyHardLinked ? undefined : Private(rootSearchSource).get();
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

    SearchSource.prototype.onBeginSegmentedFetch = function (initFunction) {
      let self = this;
      return Promise.try(function addRequest() {
        let req = new SegmentedRequest(self, Promise.defer(), initFunction);

        // return promises created by the completion handler so that
        // errors will bubble properly
        return req.defer.promise.then(addRequest);
      });
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
     * Create a common search request object, which should
     * be put into the pending request queye, for this search
     * source
     *
     * @param {Deferred} defer - the deferred object that should be resolved
     *                         when the request is complete
     * @return {SearchRequest}
     */
    SearchSource.prototype._createRequest = function (defer) {
      return new SearchRequest(this, defer);
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
        let source = this;
        return Promise.cast(val(this))
        .then(function (newVal) {
          return source._mergeProp(state, newVal, key);
        });
      }

      if (val == null || !key || !_.isString(key)) return;

      switch (key) {
        case 'filter':
          // user a shallow flatten to detect if val is an array, and pull the values out if it is
          state.filters = _([ state.filters || [], val ])
          .flatten()
          // Yo Dawg! I heard you needed to filter out your filters
          .reject(function (filter) {
            return !filter || _.get(filter, 'meta.disabled');
          })
          .value();
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
          addToBody();
          break;
        case 'sort':
          val = normalizeSortRequest(val, this.get('index'));
          addToBody();
          break;
        default:
          addToBody();
      }

      /**
       * Add the key and val to the body of the resuest
       */
      function addToBody() {
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
