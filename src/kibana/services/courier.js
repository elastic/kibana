define(function (require) {
  var angular = require('angular');
  var Courier = require('courier/courier');

  angular.module('kibana/services')
    .service('courier', function (es) {
      var courier = new Courier({
        fetchInterval: 15000,
        client: es
      });

      courier.on('error', function (err) {
        console.error(err);
      });

      return courier;
    });
});