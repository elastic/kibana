var _ = require('lodash');
var Promise = require('bluebird');
var getStatus = require('./get_status');
var setStatus = require('./set_status');
var util = require('util');

function Plugin(options) {
  options = _.defaults(options, {
    require: [],
    init: function (server, options) {
      return Promise.reject(new Error('You must override the init function for plugins'));
    }
  });
  _.assign(this, options);
}

module.exports = Plugin;
