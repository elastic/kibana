var config = require('../config');
var elasticsearch = require('elasticsearch');
var upgrade = require('./upgradeConfig');
var util = require('util');
var url = require('url');
var uri = url.parse(config.elasticsearch);
if (config.kibana.elasticsearch_username && config.kibana.elasticsearch_password) {
  uri.auth = util.format('%s:%s', config.kibana.elasticsearch_username, config.kibana.elasticsearch_password);
}
var client = new elasticsearch.Client({
  host: url.format(uri)
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

  return client.search(options)
  .then(upgrade)
  .catch(function (err) {
    if (!/No mapping found for \[buildNum\]|^IndexMissingException/.test(err.message)) throw err;
  });
};

