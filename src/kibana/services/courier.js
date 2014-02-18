define(function (require) {
  var angular = require('angular');
  var Courier = require('courier/courier');
  var DocSource = require('courier/data_source/doc');
  var errors = require('courier/errors');

  require('services/promises');

  angular.module('kibana/services')
    .service('courier', function (es, promises) {

      promises.playNice(DocSource.prototype, [
        'doUpdate',
        'doIndex'
      ]);

      var courier = new Courier({
        fetchInterval: 15000,
        client: es,
        promises: promises
      });

      courier.errors = errors;

      return courier;
    });
});