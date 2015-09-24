var querystring = require('querystring');
var resolve = require('url').resolve;
module.exports = function mapUri(server, prefix) {
  var config = server.config();
  return function (request, done) {
    var path = request.path.replace('/elasticsearch', '');
    var url = config.get('elasticsearch.url');
    if (path) {
      if (/\/$/.test(url)) url = url.substring(0, url.length - 1);
      url += path;
    }
    var query = querystring.stringify(request.query);
    if (query) url += '?' + query;
    done(null, url);
  };
};
