var _ = require('lodash');
var Promise = require('bluebird');

function Plugin(options) {
  this.server = null;
  this.status = null;
  this.publicPath = null;
  this.require = [];
  this.init = function (server, options) {
    return Promise.reject(new Error('You must override the init function for plugins'));
  };
  this.config = function (Joi) {
    return Joi.object({}).default();
  };
  _.assign(this, options);
}

module.exports = Plugin;
