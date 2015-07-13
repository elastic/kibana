var angular = require('angular');
var $ = require('jquery');
var _ = require('lodash');
var notify = require('components/notify');

// The Kibana App
require('modules')
.get('kibana')
.controller('ServerStatusController', function ($http, $window, $timeout) {
  var ui = this;
  ui.loading = false;

  ui.init = function () {
    $($window)
    .on('blur', ui.blur)
    .on('focus', ui.refresh);

    return ui.refresh();
  };

  ui.blur = function () {
    $timeout.cancel(ui.timeout);
  };

  ui.refresh = function () {
    ui.loading = true;

    // go ahead and get the info you want
    return $http
    .get('/api/status')
    .then(function (resp) {
      var data = resp.data;

      ui.metrics = data.metrics;
      ui.overall = data.status.overall;
      ui.statuses = data.status.statuses;
    })
    .catch(function () {
      notify.error('Failed to request server ui. Perhaps your server is down?');
    })
    .then(function () {
      ui.loading = false;
      ui.timeout = $timeout(ui.refresh, 5000);
    });
  };

  ui.init();
});
