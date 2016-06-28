var glob = require('glob');
var readfile = require('./readfile');
var path = require('path');
var _ = require('lodash');

module.exports = function(dir, grunt, options) {

  var getKey = function(file) {
    var ext = path.extname(file);
    var base = path.basename(file, ext);
    return base;
  };

  var files = glob.sync('*.{js,json,yml,yaml,cson,coffee,ls}', { cwd: dir });

  var merge = options && options.mergeFunction || _.merge;

  var obj = {};
  files.forEach(function(file) {
    var filepath = path.join(dir, file);
    var result = readfile(filepath);
    var key = getKey(filepath);
    if (_.isFunction(result)) {
      result = result(grunt, options && options.data || {});
    }

    //check if multi config
    if (key.match(/-tasks$/)) {
      var target = key.replace(/-tasks$/, '');
      for (var newKey in result) {
        var newTarget = target;
        var originalKey = newKey;
        if (newKey.indexOf('__') != -1) {
          var spl = newKey.split('__');
          newKey = spl[0];
          newTarget = target + '_' + spl[1];
        }
        if (!obj[newKey]) {
          obj[newKey] = {};
        }
        obj[newKey][newTarget] = result[originalKey];
      }
    } else {
      if (!obj[key]) {
        obj[key] = {};
      }
      obj[key] = merge(obj[key], result);
    }
  });
  return obj;

};
