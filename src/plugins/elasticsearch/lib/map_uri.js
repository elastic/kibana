import querystring from 'querystring';
import { resolve } from 'url';
import _ from 'lodash';

module.exports = function mapUri(server, prefix) {

  const filterHeaders = function (originalHeaders) {
    const headersToKeep = server.config().get('elasticsearch.requestHeaders');
    const headersToKeepNormalized = headersToKeep.map(function (header) {
      return header.trim().toLowerCase();
    });

    return _.pick(originalHeaders, headersToKeepNormalized);
  };

  const config = server.config();
  return function (request, done) {
    const path = request.path.replace('/elasticsearch', '');
    let url = config.get('elasticsearch.url');
    if (path) {
      if (/\/$/.test(url)) url = url.substring(0, url.length - 1);
      url += path;
    }
    const query = querystring.stringify(request.query);
    if (query) url += '?' + query;
    done(null, url, filterHeaders(request.headers));
  };
};
