define(function () {
  'use strict';
  var config = require('config');
  var angular = require('angular');
  return function (client, dashboard) {
    var url = config.elasticsearch+'/'+config.kibana_index+'/dashboard/'+dashboard.current.base.id;
    var body = {
      user: 'guest',
      group: 'guest',
      title: dashboard.current.title,
      dashboard: angular.toJson(dashboard.current) 
    };
    return client.put(url, body).then(function (resp) {
      return resp.data;
    });
  };
});
