/**
 * Listen for log events on the cluster and write them to the grunt log
 * @type {[type]}
 */
module.exports = logClusterLogs;

var grunt = require('grunt');
var clc = require('cli-color');
var CliTable = require('cli-table');
var _ = require('lodash');

var colors = {
  INFO: clc.green,
  DEBUG: clc.cyan,
  default: function (txt) { return txt; },
  WARN: clc.yellow,
  FATAL: clc.magentaBright,
  ERROR: clc.white.bgRed
};

function logClusterLogs(cluster) {
  cluster.on('log', function(log) {
    // ignore progress events for now
    if (log.type === 'progress') return;

    if (typeof log === 'string') {
      grunt.log.writeln(log);
      return;
    }

    var color = colors[log.level] || colors.default;
    var msg = [
      color(log.level) || '',
      log.node || '',
      log.type || '',
      log.message || ''
    ];

    grunt.log.writeln(msg.join(' - '));
  });
}
