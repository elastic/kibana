var config = require('../config');
var upgrade = require('./upgradeConfig');

module.exports = function (client) {
  var options =  {
    index: config.kibana.kibana_index,
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
  .then(upgrade(client))
  .catch(function (err) {
    if (!/SearchParseException.+mapping.+\[buildNum\]|^IndexMissingException/.test(err.message)) throw err;
  });
};

