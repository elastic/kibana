var _ = require('lodash');
var config = require('../config');
var parse = require('url').parse;

validate.Fail = function () {
  this.message = 'Kibana only support modifying the "' + config.kibana.kibana_index +
  '" index. Requests that might modify other indicies are not sent to elasticsearch.';
};

validate.BadIndex = function (index) {
  validate.Fail.call(this);
  this.message = 'Bad index "' + index + '" in request. ' + this.message;
};

function validate(req) {
  var method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD') return true;

  var segments = _.compact(parse(req.url).pathname.split('/'));
  var maybeIndex = _.first(segments);
  var maybeMethod = _.last(segments);

  var add = (method === 'POST' || method === 'PUT');
  var rem = (method === 'DELETE');

  // everything below this point assumes a destructive request of some sort
  if (!add && !rem) throw new validate.Fail();

  var bodyStr = String(req.rawBody);
  var jsonBody = bodyStr && parseJson(bodyStr);
  var bulkBody = bodyStr && parseBulk(bodyStr);

  // methods that accept standard json bodies
  var maybeMGet = ('_mget' === maybeMethod && add && jsonBody);
  var maybeSearch = ('_search' === maybeMethod && add);
  var maybeValidate = ('_validate' === maybeMethod && add);

  // methods that accept bulk bodies
  var maybeBulk = ('_bulk' === maybeMethod && add && bulkBody);
  var maybeMsearch = ('_msearch' === maybeMethod && add && bulkBody);

  // indication that this request is against kibana
  var maybeKibanaIndex = (maybeIndex === config.kibana.kibana_index);

  if (!maybeBulk) validateNonBulkDestructive();
  else validateBulkBody(bulkBody);

  return true;

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
      if (!part) throw new validate.Fail();

      body[i] = part;
    }
    return body;
  }

  function stringifyBulk(body) {
    return body.map(JSON.stringify).join('\n') + '\n';
  }

  function validateNonBulkDestructive() {
    // allow any destructive request against the kibana index
    if (maybeKibanaIndex) return;

    // allow json bodies sent to _mget _search and _validate
    if (maybeMGet || maybeSearch || maybeValidate) return;

    // allow bulk bodies sent to _msearch
    if (maybeMsearch) return;

    throw new validate.Fail();
  }

  function validateBulkBody(body) {
    while (body.length) {
      var header = body.shift();
      var req = body.shift();

      var op = _.keys(header).join('');
      var meta = header[op];

      if (!meta) throw new validate.Fail();

      var index = meta._index || maybeIndex;
      if (index !== config.kibana.kibana_index) {
        throw new validate.BadIndex(index);
      }
    }
  }
}

module.exports = validate;