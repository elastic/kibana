var querystring = require('querystring');
var resolve = require('url').resolve;
module.exports = function mapUri(server, prefix) {
  var config = server.config();
  return function (request, done) {
    var paths = request.params.paths;
    if (!paths) {
      paths = request.path.replace('/elasticsearch', '');
    }
    if (prefix) {
      paths = prefix + '/' + paths;
    }
    var url = config.get('elasticsearch.url');
    if (!/\/$/.test(url)) url += '/';
    if (paths) url = resolve(url, paths);
    var query = querystring.stringify(request.query);
    if (query) url += '?' + query;
    done(null, url);
  };
};
