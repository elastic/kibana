var colors = require('./colors');

var colorizers = {};

Object.keys(colors).forEach(function (k) {
  var color = colors[k].split(':');
  colorizers[k] = function (s) { return s ? color[0] + s + color[1] : ''; };
});

module.exports = colorizers;
