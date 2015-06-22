(function() {
  var convert, data, intervals, major, name, names, normalize, _ref;

  names = ['firefox', 'chrome', 'safari', 'ios_saf', 'opera', 'ie', 'bb', 'android'];

  major = ['firefox', 'chrome', 'safari', 'ios_saf', 'opera', 'android', 'ie', 'ie_mob'];

  normalize = function(array) {
    return array.reverse().filter(function(i) {
      return i;
    });
  };

  intervals = function(array) {
    var i, interval, result, splited, sub, _i, _len;
    result = [];
    for (_i = 0, _len = array.length; _i < _len; _i++) {
      interval = array[_i];
      splited = interval.split('-');
      splited = splited.sort().reverse();
      sub = (function() {
        var _j, _len1, _results;
        _results = [];
        for (_j = 0, _len1 = splited.length; _j < _len1; _j++) {
          i = splited[_j];
          _results.push([i, interval, splited.length]);
        }
        return _results;
      })();
      result = result.concat(sub);
    }
    return result;
  };

  convert = function(name, data) {
    var future, result, versions;
    future = normalize(data.versions.slice(-3));
    versions = intervals(normalize(data.versions.slice(0, -3)));
    result = {};
    result.prefix = name === 'opera' ? '-o-' : "-" + data.prefix + "-";
    if (major.indexOf(name) === -1) {
      result.minor = true;
    }
    if (future.length) {
      result.future = future;
    }
    result.versions = versions.map(function(i) {
      return i[0];
    });
    result.popularity = versions.map(function(i) {
      return data.usage_global[i[1]] / i[2];
    });
    return result;
  };

  module.exports = {};

  _ref = require('caniuse-db/data').agents;
  for (name in _ref) {
    data = _ref[name];
    module.exports[name] = convert(name, data);
  }

}).call(this);
