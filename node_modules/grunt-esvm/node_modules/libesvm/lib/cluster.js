var _              = require('lodash');
var join           = require('path').join;
var child_process  = require('child_process');
var EventEmitter   = require('events').EventEmitter;
var Promise        = require('bluebird');
var purge          = require('./purge');
var install        = require('./install');
var resolvePath    = require('./resolvePath');
var installPlugins = require('./installPlugins');
var resolveVersion = require('./resolveVersion');

var exec           = Promise.promisify(child_process.exec);
var rimraf         = Promise.promisify(require('rimraf'));
var Node           = require('./node');

/**
 * The Cluster initializer
 * @param {object} options The options object
 * @param {string} version The known version
 * @returns {object}
 */
var Cluster = module.exports = function Cluster (options, version) {
  options = _.defaults(options || {}, {
     purge: false,
     fresh: false,
     directory: join(__dirname, '..', '.releases'),
     nodes: 1,
     config: {},
     log: _.bindKey(this, 'log')
  });
  this.options = options;
  this.version = version;
  this.nodes = [];
};

Cluster.prototype = _.create(EventEmitter.prototype, { constructor: Cluster });

Cluster.prototype.log = function (level, message) {
  // If level is a plain object then we should just bubble it on up.
  if (!_.isString(level)) {
    return this.emit('log', level);
  }

  // Otherwise log a new message object.
  this.emit('log', {
    timestamp: new Date(),
    type: 'cluster',
    level: level.toUpperCase(),
    node: null,
    message: message
  });
};

Cluster.prototype.initalizeNodes = function (path) {
  var self = this;
  var nodes = [];
  if (_.isFinite(this.options.nodes)) {
    _.times(this.options.nodes, function (index) {
      nodes.push(_.cloneDeep(self.options.config));
    });
  } else {
    nodes = _.map(this.options.nodes, function (node) {
      return _.defaults(node, self.options.config);
    });
  }

  this.nodes = _.map(nodes, function (config) {
    var options = _.defaults({
      config: config,
      path: path
    }, self.options);

    if (self.options.clusterNameOverride) {
      options.clusterNameOverride = self.options.clusterNameOverride;
    }
    var node = new Node(options);
    var log = _.bindKey(self, 'log');
    node.on('log', log);
    node.on('error', function (error) {
      self.emit('error', error);
    });
    return node;
  });

  return this.nodes;
};

Cluster.prototype.start = function (cb) {
  var self = this;

  return resolvePath(this.options).then(function (path) {
    var startNodes = function () {
      var nodes = self.initalizeNodes(path);
      self.log('INFO', 'Starting ' + nodes.length + ' nodes');
      var promises = _.map(nodes, function (node) {
        return node.start();
      });
      return Promise.all(promises);
    };
    var dataPath = join(path, 'data');
    var purgeData = self.options.purge;
    if (purgeData) self.log('INFO', 'Purging ' + dataPath);
    return Promise.resolve(purgeData && purge(dataPath))
      .then(startNodes);
  }).nodeify(cb);
};

Cluster.prototype.shutdown = function (cb) {
  this.log('INFO', 'Shutting down cluster');
  var promises = _.map(this.nodes, function (node) {
    return node.shutdown();
  });
  return Promise.all(promises).nodeify(cb);
};

/**
 * Install all the plugins listed in the this.options.plugins
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
Cluster.prototype.installPlugins = function (cb) {
  var self = this;
  return Promise.props({
    path: resolvePath(this.options),
  })
  .then(function (results) {
    return installPlugins({
      path: results.path,
      plugins: self.options.plugins,
      log: _.bindKey(self, 'log')
    }).nodeify(cb);
  });
};

/**
 * Installs the current version of Elasticsearch
 * @param {function} cb The node style callback
 * @returns {Promise}
 */
Cluster.prototype.install = function (cb) {
  return install(this.options, cb);
};
