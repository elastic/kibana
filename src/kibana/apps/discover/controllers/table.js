define(function (require) {
  var _ = require('utils/mixins');
  var angular = require('angular');
  var moment = require('moment');
  var settingsHtml = require('text!../partials/settings.html');
  var saveHtml = require('text!../partials/save_search.html');
  var loadHtml = require('text!../partials/load_search.html');

  var interval = require('utils/interval');
  var datemath = require('utils/datemath');

  require('notify/notify');
  require('components/timepicker/timepicker');
  require('directives/fixed_scroll');
  require('filters/moment');
  require('courier/courier');
  require('index_patterns/index_patterns');
  require('state_management/app_state');
  require('services/timefilter');

  require('apps/visualize/saved_visualizations/_adhoc_vis');

  var app = require('modules').get('app/discover', [
    'kibana/services',
    'kibana/notify',
    'kibana/courier',
    'kibana/index_patterns'
  ]);

  app.controller('discoverTable', function ($scope, config, courier, $route, savedSearches, savedVisualizations,
    Notifier, $location, globalState, AppState, timefilter, AdhocVis, Promise) {

  });
});