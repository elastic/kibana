define(function (require) {
  var Courier = require('courier/courier');
  var DataSource = require('courier/data_source/data_source');
  var DocSource = require('courier/data_source/doc');
  var errors = require('courier/errors');

  require('services/promises');
  require('services/es');

  var courier; // share the courier amoungst all of the apps
  require('modules')
    .get('kibana/services')
    .service('courier', function (es, $rootScope, promises, configFile) {
      if (courier) return courier;

      promises.playNice(DataSource.prototype, [
        'getFields',
        'clearFieldCache'
      ]);

      promises.playNice(DocSource.prototype, [
        'doUpdate',
        'doIndex'
      ]);

      courier = new Courier({
        fetchInterval: 0,
        client: es,
        internalIndex: configFile.kibanaIndex
      });

      courier.errors = errors;

      courier.rootSearchSource = courier
        .createSource('search')
        .$scope($rootScope);

      return courier;
    });
});