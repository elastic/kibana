define(function (require) {
  var angular = require('angular');
  var Courier = require('courier/courier');
  var DocSource = require('courier/data_source/doc');
  var errors = require('courier/errors');

  require('services/promises');
  require('services/es');

  var courier; // share the courier amoungst all of the apps
  angular.module('kibana/services')
    .service('courier', function (es, promises) {
      if (courier) return courier;

      promises.playNice(DocSource.prototype, [
        'doUpdate',
        'doIndex'
      ]);

      courier = new Courier({
        fetchInterval: 15000,
        client: es,
        promises: promises
      });

      courier.errors = errors;

      courier.rootSearchSource = courier.createSource('search');

      return courier;
    });
});