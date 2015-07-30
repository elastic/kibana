var _ = require('lodash');
var SourceMapConsumer = require('source-map/lib/source-map/source-map-consumer').SourceMapConsumer;
var parse = require('url').parse;

function SourceMapReader(url, map) {
  this.smc = new SourceMapConsumer(map);
  this.url = parse(url);
  this.re = new RegExp('(^|/)' + _.escapeRegExp(this.url.pathname.slice(1)) + '($|\\?|#)');
}

SourceMapReader.prototype.matchUrl = function (stackFileName) {
  return this.re.test(stackFileName);
};

module.exports = SourceMapReader;
