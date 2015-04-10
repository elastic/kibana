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

Plugin.prototype.setStatus = function (state, message) {
  var previous = getStatus(this.name);
  if (previous.state === state && previous.message === message) return;
  var logMsg = util.format('[ %s ] Change status from %s to %s - %s', this.name, previous.state, state, message);
  this.server.log('plugin', logMsg);
  setStatus(this.name, state, message);
};

module.exports = Plugin;
