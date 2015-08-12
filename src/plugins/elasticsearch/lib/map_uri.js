var querystring = require('querystring');
var resolve = require('url').resolve;
module.exports = function mapUri(server, prefix) {
  var config = server.config();
  return function (request, done) {
    var path = request.path.replace('/elasticsearch', '');
    var url = config.get('elasticsearch.url');
    if (!/\/$/.test(url)) url += '/';
    if (path) url = resolve(url, path);
    var query = querystring.stringify(request.query);
    if (query) url += '?' + query;
    done(null, url);
  };
};
