define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  require('components/notify/notify');

  require('modules').get('components/setup', ['kibana', 'kibana/notify', 'kibana/config'])
  .service('kbnSetup', function (Private, Promise, Notifier, es, configFile) {
    // setup steps
    var checkForEs = Private(require('components/setup/steps/check_for_es'));
    var checkEsVersion = Private(require('components/setup/steps/check_es_version'));
    var checkForKibanaIndex = Private(require('components/setup/steps/check_for_kibana_index'));
    var createKibanaIndex = Private(require('components/setup/steps/create_kibana_index'));

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