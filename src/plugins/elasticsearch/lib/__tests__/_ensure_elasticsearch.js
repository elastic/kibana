var portscanner = require('portscanner');
var path = require('path');
var Promise = require('bluebird');
var libesvm = require('libesvm');

function startEs() {
  var options = {
    version: '1.4.4',
    directory: path.join(__dirname, '..', '..', 'esvm'),
    config: {
      'cluster.name': 'test',
      'network.host': '127.0.0.1'
    }
  };
  var cluster = libesvm.createCluster(options);
  return cluster.install().then(function () {
    return cluster.start();
  }).then(function () {
    after(function () {
      this.timeout(120000);
      return cluster.shutdown();
    });
    return cluster;
  });
}

function maybeStartES() {
  return new Promise(function (resolve, reject) {
    portscanner.checkPortStatus(9200, '127.0.0.1', function (err, status) {
      if (err) return reject(err);
      if (status === 'closed') return startEs().then(resolve);
      resolve();
    });
  });
}

module.exports = function () {
  this.timeout(120000);
  return maybeStartES();
};
