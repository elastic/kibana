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

  // everything below this point assumes a destructive request of some sort
  if (!add && !rem) return false;

  var body = req.rawBody;
  var jsonBody = body && parseJson(body);
  var bulkBody = body && parseBulk(body);

  // methods that accept standard json bodies
  var maybeMGet = (add && jsonBody && maybeMethod === '_mget');
  var maybeSearch = (add && jsonBody && maybeMethod === '_search');
  var maybeValidate = (add && jsonBody && maybeMethod === '_validate');

  // methods that accept bulk bodies
  var maybeBulk = (add && bulkBody && maybeMethod === '_bulk');
  var maybeMsearch = (add && bulkBody && maybeMethod === '_msearch');

  // indication that this request is against kibana
  var maybeKibanaIndex = (maybeIndex === config.kibana.kibana_index);

  if (!maybeBulk) {
    // allow any destructive request against the kibana index
    if (maybeKibanaIndex) return true;

    // force these requests to thave the exact json body we validated
    if (maybeMGet || maybeSearch || maybeValidate) {
      req.rawBody = JSON.stringify(jsonBody);
      return true;
    }

    // force these requests to have the exact bulk body we validated
    if (maybeMsearch) {
      req.rawBody = stringifyBulk(bulkBody);
      return true;
    }

    return false;
  }

  // at this point, we can assume that the request is a bulk request
  if (validateBulkBody(bulkBody)) {
    req.rawBody = stringifyBulk(bulkBody);
    return true;
  }

  // catch all other scenarios
  return false;

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

  function stringifyBulk(body) {
    return body.map(JSON.stringify).join('\n') + '\n';
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