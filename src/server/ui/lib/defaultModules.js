var _ = require('lodash');
var findModuleIds = require('./findModuleIds');

module.exports = function () {
  return {

    // default angular modules to depend on
    angular: [
      'elasticsearch',
      'pasvaz.bindonce'
    ],

    // default require modules to load
    require: _([
      // default bower_components
      [
        'angular-bindonce',
        'elasticsearch'
      ],

      // all directives and filters, which are auto-loaded
      _.values(findModuleIds()),

      // default components
      [
        'chrome',
        'components/bind',
        'components/bound_to_config_obj',
        'components/config/config',
        'components/courier/courier',
        'components/chrome-context/index',
        'components/debounce',
        'components/doc_title/doc_title',
        'components/elastic_textarea',
        'components/es',
        'components/events',
        'components/fancy_forms/fancy_forms',
        'components/filter_bar/filter_bar',
        'components/filter_manager/filter_manager',
        'components/index_patterns/index_patterns',
        'components/listen',
        'components/notify/notify',
        'components/persisted_log/persisted_log',
        'components/private',
        'components/promises',
        'components/state_management/app_state',
        'components/state_management/global_state',
        'components/storage/storage',
        'components/stringify/register',
        'components/style_compile/style_compile',
        'components/timefilter/timefilter',
        'components/timepicker/timepicker',
        'components/tooltip/tooltip',
        'components/typeahead/typeahead',
        'components/ui-bootstrap/index',
        'components/url/url',
        'components/validateDateInterval',
        'components/validate_query/validate_query',
        'components/watch_multi'
      ]
    ])
    .flattenDeep()
    .uniq()
    .value()
  };
};
