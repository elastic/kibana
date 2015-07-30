var _ = require('lodash');
var $ = require('jquery');
var resolve = require('bluebird').resolve;
var fetch = require('exports?window.fetch!imports?Promise=bluebird!whatwg-fetch');

var setErrorStack = require('./setErrorStack');
var translateStackLine = require('./translateStackLine');
var stackLineFormat = require('./stackLineFormat');
var SourceMapReader = require('./SourceMapReader');

function StackTraceMapper() {
  this.maps = [];
  this.init = _.once(this.init);
  this.getMapFor = _.memoize(this.getMapFor);
  _.bindAll(this, 'init', 'mapError', 'getMapFor', 'mapLine', 'loadMaps');
}

StackTraceMapper.prototype.init = function (mapUrls) {
  return this.loadMaps(mapUrls).return(this);
};

StackTraceMapper.prototype.mapError = function (err) {
  if (!stackLineFormat || !err.stack) return err;

  var stack = err.stack.replace(stackLineFormat, this.mapLine);
  return setErrorStack(err, this.mapLine);
};

StackTraceMapper.prototype.mapLine = function (match, filename, line, col) {
  return translateStackLine(this.getMapFor(filename), match, filename, line, col);
};

StackTraceMapper.prototype.getMapFor = function (url) {
  return _.find(this.maps, function (map) {
    return map.matchUrl(url);
  });
};

StackTraceMapper.prototype.loadMaps = function (mapUrls) {
  mapUrls = _.clone(mapUrls || {});

  var maps = this.maps;

  $('script[src][src-map]').each(function () {
    var $el = $(this);
    mapUrls[$el.attr('src')] = $el.attr('src-map');
  });

  return resolve(_.pairs(mapUrls))
  .map(
    _.spread(function (url, mapUrl) {
      return fetch(mapUrl)
      .then(function (resp) { return resp.json(); })
      .then(function (map) {
        maps.push(new SourceMapReader(url, map));
      });
    })
  );
};

StackTraceMapper.getInstance = _.once(function () {
  return (new StackTraceMapper()).init();
});

module.exports = StackTraceMapper;
