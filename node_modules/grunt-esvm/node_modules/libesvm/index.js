var loader = module.exports;
var Cluster = require('./lib/cluster');

/**
 * var options = {
 *   version: '~1.2.0',
 *   directory: '~/.esvm',
 *   plugins: ['elasticsearch/marvel/latest'],
 *   purge: true, // Purge the data directory
 *   fresh: true, // Download a fresh copy
 *   loggerStreams: [ process.stdout ], // Bunyan Streams 
 *   config: {
 *     'cluster.name': 'My Test Cluster',
 *     'http.port': 9200
 *   }
 * };
 *
 * var cluster = loader.createCluster(options);
 * cluster.start().then(function () {
 *   // Do stuff here
 *   cluster.stop();
 * });
 */
loader.createCluster = function (options, cb) {
  var cluster = new Cluster(options);
  return cluster;
};

