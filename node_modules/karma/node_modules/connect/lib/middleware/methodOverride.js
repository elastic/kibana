/*!
 * Connect - methodOverride
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var deprecate = require('depd')('connect');
var methodOverride = require('method-override');

/**
 * Method Override:
 *
 * See [method-override](https://github.com/expressjs/method-override)
 *
 * @param {String} key
 * @return {Function}
 * @api public
 */

module.exports = function(key){
  // this is a shim to keep the interface working with method-override@2
  var opts = { methods: null };
  var prop = key || '_method';
  var _headerOverride = methodOverride('X-HTTP-Method-Override', opts);
  var _bodyOverride = methodOverride(function(req){
    if (req.body && typeof req.body === 'object' && prop in req.body) {
      var method = req.body[prop];
      delete req.body[prop];
      return method;
    }
  }, opts);

  return function(req, res, next){
    _bodyOverride(req, res, function(err){
      if (err) return next(err);
      _headerOverride(req, res, next);
    });
  };
};

module.exports = deprecate.function(module.exports,
  'methodOverride: use method-override npm module instead');
