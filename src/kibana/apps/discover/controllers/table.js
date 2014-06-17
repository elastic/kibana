define(function (require) {
  var _ = require('utils/mixins');
  var angular = require('angular');
  var moment = require('moment');
  var settingsHtml = require('text!apps/discover/partials/settings.html');
  var saveHtml = require('text!apps/discover/partials/save_search.html');
  var loadHtml = require('text!apps/discover/partials/load_search.html');

  var interval = require('utils/interval');
  var datemath = require('utils/datemath');

  require('components/notify/notify');
  require('components/timepicker/timepicker');
  require('directives/fixed_scroll');
  require('filters/moment');
  require('components/courier/courier');
  require('components/index_patterns/index_patterns');
  require('components/state_management/app_state');
  require('services/timefilter');

  require('apps/visualize/saved_visualizations/_adhoc_vis');

  var app = require('modules').get('apps/discover', [
    'kibana/services',
    'kibana/notify',
    'kibana/courier',
    'kibana/index_patterns'
  ]);
});