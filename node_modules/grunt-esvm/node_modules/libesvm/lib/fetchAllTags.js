var _ = require('lodash');
var cache = require('./cache');
var Promise = require('bluebird');
var utils = require('./utils');

/**
 * Fetches all the tags from GitHub
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
module.exports = function (cb) {
  return Promise.props({
    tags: cache.get('tags'),
    etag: cache.get('tagsEtag'),
    etagRefreshedAt: cache.get('tagsEtagRefreshedAt')
  })
  .then(function (props) {
    var reqOpts = {
      url: 'https://esvm-props.kibana.rocks/builds',
      json: true,
      headers: {}
    };

    if (props.etag && props.tags && props.tags.branches && props.tags.releases) {
      var sinceRefresh = Date.now() - props.etagRefreshedAt;
      var fiveMinutes = 1000 * 60 * 5;

      if (sinceRefresh <= fiveMinutes) {
        // etag refreshed within the last 5 minutes, resolving with cache
        return props.tags;
      }

      reqOpts.headers['If-None-Match'] = props.etag;
    }

    return utils.request(reqOpts)
    .then(function (args) {
      var resp = args[0];
      var body = args[1];

      switch (resp && resp.statusCode) {
      case 200:
        return Promise.all([
          cache.set('tags', body),
          cache.set('tagsEtag', resp.headers.etag),
          cache.set('tagsEtagRefreshedAt', Date.now())
        ])
        .thenReturn(body);

      case 304:
        return Promise.all([
          cache.set('tagsEtag', resp.headers.etag),
          cache.set('tagsEtagRefreshedAt', Date.now())
        ])
        .thenReturn(props.tags);

      default:
        throw new Error('Unable to fetch tags, got response ' + (resp ? resp.statusCode : 0) + ' - ' + body);
      }
    })
    .catch(function (err) {
      return Promise.resolve(props.tags || {});
    });
  })
  .nodeify(cb);
};
