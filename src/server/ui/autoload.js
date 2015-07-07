var _ = require('lodash');
var scan = require('./lib/scan');

exports.reload = function () {
  // default bower_components
  exports.bower = [
    'angular-bindonce',
    'elasticsearch'
  ];

  exports.directives = scan('directives');
  exports.filters = scan('filters');

  var excludeStyles = [
    'ui-styles/mixins.less',
    'ui-styles/variables.less',
    'ui-styles/theme.less'
  ];

  exports.styles = scan('ui-styles', true).filter(function (file) {
    var i = excludeStyles.indexOf(file);
    if (i > -1) {
      excludeStyles.splice(i, 1);
      return false;
    }

    return true;
  });

  if (excludeStyles.length) {
    throw new Error(`Styles which were supposed to be excluded from autoload not found! ${excludeStyles}`);
  }

  exports.uiComponents = [
    'chrome',
    'chrome/context',
    'components/bind',
    'components/bound_to_config_obj',
    'components/config/config',
    'components/courier/courier',
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
  ];

  // default angular modules to depend on
  exports.angular = [
    'elasticsearch',
    'pasvaz.bindonce'
  ];

  exports.require = _.flatten([
    exports.bower,
    exports.directives,
    exports.filters,
    exports.styles,
    exports.uiComponents
  ]);
};

exports.reload();
