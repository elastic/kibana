/*
 * grunt-esvm
 * https://github.com/spenceralger/grunt-esvm
 *
 * Copyright (c) 2014 Spencer Alger
 * Licensed under the Apache, 2.0 licenses.
 */

var libesvm = require('libesvm');
var _ = require('lodash');
var logClusterLogs = require('../lib/logClusterLogs');
var Table = require('cli-table');
var Promise = require('bluebird');
var get = Promise.promisify(require('wreck').get, require('wreck'));
var moment = require('moment');

module.exports = function (grunt) {

  var activeClusters = {};

  function shutdown(name, done) {
    var cluster = activeClusters[name];

    if (!cluster)
      grunt.fail.warn('Unable to shutdown unknown cluster "' + name + '"');

    return cluster.shutdown()
    .finally(function () {
      delete activeClusters[name];
    })
    .nodeify(done);
  }

  process.on('exit', function () {
    _.forOwn(activeClusters, function (cluster) {
      cluster.shutdown();
    });
  });

  grunt.registerMultiTask('esvm', 'Create elasticsearch clusters from grunt.', function (keepalive) {
    // the config name, "esvm:<target>"
    var name = this.target;
    var flags = _(grunt.option('esvm-flags'))
    .tap(function (s) { return _.isString(s) ? s.split(',') : []; })
    .map(function (f) { return f.trim(); })
    .filter(Boolean)
    .value();

    var options = this.options({
      quiet: false,
      fresh: _.contains(flags, 'fresh'),
      purge: _.contains(flags, 'purge'),
      shield: undefined
    });

    // deeply merge the default config
    options.config = _.defaultsDeep(options.config || {}, grunt.config.get('esvm.options.config') || {});

    // strip null and undefined values from config after merge
    (function stripNulls(obj) {
      _.forOwn(obj, function forEachInner(val, key, obj) {
        if (val == null) {
          delete obj[key];
        } else if (_.isPlainObject(val)) {
          stripNulls(val);
        } else if (_.isArray(val)) {
          val.forEach(forEachInner);
        }
      });
    }(options.config));

    if (activeClusters[name]) {
      grunt.fail.warn('There is already a "' + name + '" cluster running.');
    }

    var quiet = grunt.option('verbose') ? false : options.quiet;
    delete options.quiet;

    grunt.log.debug('Creating libesvm cluster with: ' + JSON.stringify(options, null, '  '));

    var cluster = activeClusters[name] = libesvm.createCluster(options);

    if (!quiet) {
      logClusterLogs(cluster);
    }

    grunt.log.writeln('starting up "' + name + '" cluster');
    var startup = Promise.resolve(cluster.install())
    .then(function () {
      return cluster.installPlugins();
    })
    .then(function () {
      return cluster.start();
    })
    .map(function (node) {
      if (node.version) return node;

      return get('http://localhost:' + node.port, { json: 'force' })
      .spread(function (resp, payload) {
        if (resp.statusCode > 200) return node;

        grunt.log.debug(payload);
        var sha = _.get(payload, 'version.build_hash', '').slice(0, 7);
        if (String(sha).match(/\$\{.+\}/)) {
          node.branchInfo = '- no build info -';
        }

        var ts = _.get(payload, 'version.build_timestamp', _.get(payload, 'version.build_date', 0));
        var when = ts === 'NA' ? '(build time unkown)' : ' (built ' + moment(ts).fromNow() + ')';
        node.branchInfo = node.branch + '@' + sha + when;
        return node;
      });
    })
    .then(function (nodes) {
      grunt.log.ok('Started ' + nodes.length + ' Elasticsearch nodes.');

      var showBranch = _.some(nodes, 'branch');
      var showVersion = _.some(nodes, 'version');

      var t = [
        [
          'port',
          showBranch ? 'branch' : null,
          showVersion ? 'version' : null,
          'node name'
        ]
      ].concat(nodes.map(function (node) {
        return [
          node.port || '?',
          showBranch ? node.branchInfo || '?': null,
          showVersion ? node.version || '?': null,
          node.name || '?'
        ];
      }))
      .map(function (row) {
        return _.reject(row, _.isNull);
      });

      var table = new Table({
        head: t[0]
      });

      t.slice(1).forEach(function (r) {
        table.push(r);
      });

      grunt.log.writeln(table.toString());
    });


    if (keepalive === 'keepalive') {
      grunt.log.writeln('Keeping elasticsearch alive, to shutdown press command/control+c');
      process.on('SIGINT', _.partial(shutdown, name, this.async()));
      startup.catch(_.bindKey(grunt.fail, 'fatal'));
      cluster.on('error', _.bindKey(grunt.fail, 'fatal'));
    } else {
      startup.nodeify(this.async());
    }
  });

  grunt.registerTask('esvm_shutdown', function (name) {
    shutdown(name, this.async());
  });

};
