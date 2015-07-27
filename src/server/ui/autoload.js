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
    'ui/config',
    'ui/courier',
    'ui/debounce',
    'ui/doc_title',
    'ui/elastic_textarea',
    'ui/es',
    'ui/events',
    'ui/fancy_forms',
    'ui/filter_bar',
    'ui/filter_manager',
    'ui/index_patterns',
    'ui/listen',
    'ui/notify',
    'ui/persisted_log',
    'ui/private',
    'ui/promises',
    'ui/state_management/app_state',
    'ui/state_management/global_state',
    'ui/storage',
    'ui/stringify/register',
    'ui/styleCompile',
    'ui/timefilter',
    'ui/timepicker',
    'ui/tooltip',
    'ui/typeahead',
    'ui/url',
    'ui/validateDateInterval',
    'ui/validate_query',
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
