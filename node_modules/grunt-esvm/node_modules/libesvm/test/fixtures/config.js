var _ = require('lodash');

var defaults = {
  "config": {
    "cluster": {
      "name": "machine.hostname"
    }
  },
  "path": "../../tmp/test-cluster",
  "directory": "../../tmp",
  "plugins": [],
  "purge": false,
  "fresh": false,
  "nodes": 1,
  "version": "*"
};

exports.create = function (params) {
  return _.assign({}, defaults, params);
}