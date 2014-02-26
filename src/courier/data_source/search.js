define(function (require) {
  var DataSource = require('courier/data_source/data_source');
  var inherits = require('utils/inherits');
  var errors = require('courier/errors');
  var FetchFailure = require('courier/errors').FetchFailure;
  var _ = require('lodash');

  function SearchSource(courier, initialState) {
    DataSource.call(this, courier, initialState);
  }
  inherits(SearchSource, DataSource);

  /**
   * Method used by the Courier to fetch multiple SearchSource request at a time.
   * Those objects come in via the refs array, which is a list of objects containing
   * a `source` keys.
   *
   * @param  {Courier} courier - The courier requesting the results
   * @param  {array} refs - The list of refs
   * @param  {Function} cb - Callback
   * @return {undefined}
   */
  SearchSource.fetch = function (courier, refs, cb) {
    var client = courier._getClient();
    var allRefs = [];
    var body = '';

    _.each(refs, function (ref) {
      var source = ref.source;
      if (source._getType() !== 'search') {
        return;
      }
      allRefs.push(source);

      var state = source._flatten();
      body +=
        JSON.stringify({ index: state.index, type: state.type })
        + '\n'
        + JSON.stringify(state.body)
        + '\n';
    });

    return client.msearch({ body: body }, function (err, resp) {
      if (err) return cb(err);

      _.each(resp.responses, function (resp, i) {
        var source = allRefs[i];
        if (resp.error) return source._error(new FetchFailure(resp));
        source.emit('results', resp);
      });

      cb(void 0, resp);
    });
  };

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
    'index',
    'indexInterval', // monthly, daily, etc
    'type',
    'query',
    'filter',
    'sort',
    'highlight',
    'aggs',
    'from',
    'size',
    'source',
    'inherits'
  ];

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
    switch (key) {
    case 'inherits':
    case '_type':
      // ignore
      return;
    case 'filter':
      state.filters = state.filters || [];
      state.filters.push(val);
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
      if (key && state.body[key] == null) {
        state.body[key] = val;
      }
    }
  };

  return SearchSource;
});