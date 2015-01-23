var config = require('../config');
var elasticsearch = require('elasticsearch');
var upgrade = require('./upgradeConfig');
var client = new elasticsearch.Client({
  host: config.elasticsearch
});

module.exports = function () {
  var options =  {
    index: '.kibana',
    type: 'config',
    body: {
      size: 1000,
      sort: [ { buildNum: { order: 'desc' } } ],
      query: {
        filtered: {
          filter: {
            bool: {
              must_not: [ { query: { match: { _id: '@@version' } } } ]
            }
          }
        }
      }
    }
  };

  return client.search(options).then(upgrade);
};

