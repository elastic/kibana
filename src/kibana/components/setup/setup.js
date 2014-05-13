define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  require('notify/notify');

  require('modules').get('kibana/services')
  .service('kbnSetup', function (Private, Promise, Notifier, es, configFile) {
    // setup steps
    var checkForEs = Private(require('./steps/check_for_es'));
    var checkEsVersion = Private(require('./steps/check_es_version'));
    var checkForKibanaIndex = Private(require('./steps/check_for_kibana_index'));
    var createKibanaIndex = Private(require('./steps/create_kibana_index'));

    var notify = new Notifier({ location: 'Setup' });

    return _.once(function () {
      var complete = notify.lifecycle('bootstrap');

      return checkForEs()
      .then(checkEsVersion)
      .then(checkForKibanaIndex)
      .then(function (exists) {
        if (!exists) return createKibanaIndex();
      })
      .then(complete, complete.failure);
    });
  });
});