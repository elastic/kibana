define(function (require) {
  var angular = require('angular');
  var Courier = require('courier/courier');
  var DocSource = require('courier/data_source/doc');

  require('services/promises');

  angular.module('kibana/services')
    .service('courier', function (es, promises) {

      promises.playNice(DocSource.prototype, [
        'update',
        'index'
      ]);

      var courier = new Courier({
        fetchInterval: 15000,
        client: es,
        promises: promises
      });

      return courier;
    });
});