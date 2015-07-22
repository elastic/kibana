var _ = require('lodash');
var scan = require('./lib/scan');

function findStyles() {
  var base = ['ui/styles/theme.less', 'ui/styles/base.less'];
  var exclude = ['ui/styles/mixins.less', 'ui/styles/variables.less'];
  var found = scan('styles', true);

  return _.difference(_.union(base, found), exclude);
}

exports.reload = function () {
  exports.directives = scan('directives');
  exports.filters = scan('filters');
  exports.styles = findStyles();
  exports.modules = [
    'angular',
    'ui/chrome',
    'ui/chrome/context',
    'ui/bind',
    'ui/bound_to_config_obj',
    'ui/config/config',
    'ui/courier/courier',
    'ui/debounce',
    'ui/doc_title/doc_title',
    'ui/elastic_textarea',
    'ui/es',
    'ui/events',
    'ui/fancy_forms/fancy_forms',
    'ui/filter_bar/filter_bar',
    'ui/filter_manager/filter_manager',
    'ui/index_patterns/index_patterns',
    'ui/listen',
    'ui/notify/notify',
    'ui/persisted_log/persisted_log',
    'ui/private',
    'ui/promises',
    'ui/state_management/app_state',
    'ui/state_management/global_state',
    'ui/storage/storage',
    'ui/stringify/register',
    'ui/style_compile/style_compile',
    'ui/timefilter/timefilter',
    'ui/timepicker/timepicker',
    'ui/tooltip/tooltip',
    'ui/typeahead/typeahead',
    'ui/url/url',
    'ui/validateDateInterval',
    'ui/validate_query/validate_query',
    'ui/watch_multi'
  ];

  exports.require = _.flatten([
    exports.directives,
    exports.filters,
    exports.styles,
    exports.modules
  ]);
};

exports.reload();
