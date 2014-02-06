define(function (require) {
  'use strict';
  var _ = require('lodash');
  var stringify = _.compose(encodeURIComponent, JSON.stringify);

  return function generateQueryAndLink (data) {
    var query, dashboard;
    if (data.type === 'node') {
      dashboard = 'marvel.nodes_stats.js';
      query = { a: data.name, q: 'node.ip_port.raw:"'+data.ip_port+'"' };
    } else {
      dashboard = 'marvel.indices_stats.js';
      query = { a: data.name, q: 'index.raw:"'+data.name+'"' };
    }
    return '#/dashboard/script/'+dashboard+'?queries='+stringify([query]);
  };
    
});
