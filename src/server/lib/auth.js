var config = require('../config');
var httpAuth = require('http-auth');
module.exports = function () {
  var basic;
  if (config.htpasswd) {
    basic = httpAuth.basic({ file: config.htpasswd });
    return httpAuth.connect(basic);
  }
  return function (req, res, next) { return next(); };
};
