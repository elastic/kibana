var _ = require('lodash');
var config = require('../config');
var parse = require('url').parse;

module.exports = function (req) {
  var method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD') return true;

  var segments = _.compact(parse(req.url).pathname.split('/'));
  var maybeIndex = _.first(segments);
  var maybeMethod = _.last(segments);

  var add = (method === 'POST' || method === 'PUT');
  var rem = (method === 'DELETE');

  var body = req.rawBody;
  var jsonBody = body && parseJson(body);
  var bulkBody = body && parseBulk(body);

  var destuctive = (add || rem);
  var maybeMGet = (add && jsonBody && maybeMethod === '_mget');
  var maybeBulk = (add && bulkBody && maybeMethod === '_bulk');
  var maybeMsearch = (add && bulkBody && maybeMethod === '_msearch');
  var maybeKibanaIndex = (maybeIndex === config.kibana.kibana_index);

  if (!destuctive) return false;
  if ((maybeKibanaIndex || maybeMsearch || maybeMGet) && !maybeBulk) return true;
  if (!maybeBulk) return false;

  // at this point the only valid option is a bulk body
  return validateBulkBody(bulkBody);

  function parseJson(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return;
    }
  }

  function parseBulk(str) {
    var parts = str.split(/\r?\n/);

    var finalLine = parts.pop();
    var evenJsons = (parts.length % 2 === 0);

    if (finalLine !== '' || !evenJsons) return;

    var body = new Array(parts.length);
    for (var i = 0; i < parts.length; i++) {
      var part = parseJson(parts[i]);
      if (!part) return;
      body[i] = part;
    }
    return body;
  }

  function validateBulkBody(body) {
    while (body.length) {
      var header = body.shift();
      var req = body.shift();

      var op = _.keys(header).join('');
      var meta = header[op];

      if (!meta) return false;

      var index = meta.index || maybeIndex;
      if (index !== config.kibana.kibana_index) {
        return false;
      }
    }

    return true;
  }
};