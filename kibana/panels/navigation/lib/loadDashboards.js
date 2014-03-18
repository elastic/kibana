define(function (require) {
  'use strict';
  var config = require('config');
  return function (client, ids) {
    var url = config.elasticsearch+'/'+config.kibana_index+'/dashboard/_mget';
    var body = {
      ids: ids
    };
    return client.post(url, body).then(function (resp) {
      return resp.data.docs.filter(function (row) {
        // Elasticsearch 0.9.x uses exists instead of found so we need to check
        // for that first to see if it exists. Otherwise use row.found.
        if (row.exists != null) {
          return row.exists;
        }
        return row.found;
      });
    });
  };
});
