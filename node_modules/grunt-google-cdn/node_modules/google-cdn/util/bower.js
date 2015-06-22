'use strict';

var path = require('path');
var bowerUtil = module.exports;


bowerUtil.joinComponent = function joinComponent(directory, component) {
  var dirBits = directory.split(path.sep);

  // Always join the path with a forward slash, because it's used to replace the
  // path in HTML.
  return path.join(dirBits.join('/'), component).replace(/\\/g, '/');
};
