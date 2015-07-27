var _ = require('lodash');
var $ = require('jquery');
var resolve = require('bluebird').resolve;
var fetch = require('exports?window.fetch!imports?Promise=bluebird!whatwg-fetch');
var SourceMapConsumer = require('source-map/lib/source-map/source-map-consumer').SourceMapConsumer;
var parse = require('url').parse;

var stackLineRE = (function () {
  var opts = [
    /@((?:[!#$&-;=?-\[\]_a-z~]|%[0-9a-f]{2})+\.js)\:(\d+)(?:\:(\d+)|())/ig,
    /(?: \(|at )((?:[!#$&-;=?-\[\]_a-z~]|%[0-9a-f]{2})+\.js)\:(\d+)(?:\:(\d+)|())/ig
  ];
  var sample;
  try { throw new Error('msg'); } catch (e) { sample = e.stack; }
  var format = _.find(opts, function (format) { return format.test(sample); });

  if (!format && window.console && window.console.log) {
    window.console.log('unable to pick format with stack trace sample ' + sample);
  }

  return format;
}());

function StackTraceMapper() {
  this.maps = [];

  this.init = _.once(this.init);
  this.getMapFor = _.memoize(this.getMapFor);
  _.bindAll(this, 'init', 'mapError', 'getMapFor', 'mapLine', 'loadMaps');
}

StackTraceMapper.prototype.init = function () {
  return this.loadMaps().return(this);
};

StackTraceMapper.prototype.mapError = function (err) {
  if (!stackLineRE || !err.stack) return err;

  // err.stack is not always writeable, so we
  // have to replace the error. In order for the error
  // to also serialize properly we copy all enumerable properties
  // and extend the err object so it is still an instanceof Error

  var props = _.mapValues(err, function (val) {
    return {
      enumerable: true,
      value: val
    };
  });

  props.stack = {
    enumerable: true,
    value: err.stack.replace(stackLineRE, this.mapLine)
  };

  return Object.create(err, props);
};

StackTraceMapper.prototype.getMapFor = function (url) {
  return _.find(this.maps, function (map) {
    return map.matchUrl(url);
  });
};

StackTraceMapper.prototype.mapLine = function (match, url, urlLine, urlCol) {
  var map = this.getMapFor(url);
  if (!map) return match;

  var position = {
    line: parseFloat(urlLine) || 0,
    column: parseFloat(urlCol) || 0
  };
  var orig = map.smc.originalPositionFor(position);

  if (!orig || !orig.source) return match;

  var source = orig.source;
  var line = orig.line;
  var column = orig.column;
  if (column === 0 && position.column) {
    // since our url isn't minified, we might need to remove this eventually
    column = position.column;
  }

  // fold the components into the original match, so that supporting
  // characters (parens, periods, etc) from the format are kept, and so
  // we don't accidentally replace the wrong part we use splitting and consumption
  var folds = _.compact([
    [url, source],
    [urlLine, line],
    urlCol ? [urlCol, column] : false
  ]);

  var remains = match;
  var resp = '';
  while (folds.length) {
    var fold = folds.shift();
    var wrappingContent = remains.split(fold[0]);
    resp += wrappingContent.shift() + fold[1];
    remains = wrappingContent.join(fold[0]);
  }

  return resp;
};

StackTraceMapper.prototype.loadMaps = function () {
  var maps = this.maps;

  return resolve($('script[src][src-map]').toArray())
  .map(function (el) {
    var $el = $(el);
    var url = $el.attr('src');
    var mapUrl = $el.attr('src-map');
    $el = null;

    return fetch(mapUrl)
    .then(function (resp) { return resp.json(); })
    .then(function (map) {
      maps.push(new SourceMapReader(url, map));
    });
  });
};

StackTraceMapper.getInstance = _.once(function () {
  return (new StackTraceMapper()).init();
});

function SourceMapReader(url, map) {
  this.smc = new SourceMapConsumer(map);
  this.url = parse(url);
  this.re = new RegExp('(^|/)' + _.escapeRegExp(this.url.pathname.slice(1)) + '($|\\?|#)');
}

SourceMapReader.prototype.matchUrl = function (stackFileName) {
  return this.re.test(stackFileName);
};

SourceMapReader.prototype.transform = function (match, line, col) {

};


module.exports = StackTraceMapper;
