/**
 * main app level module
 */
define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var $ = require('jquery');
  var modules = require('modules');
  var routes = require('routes');

  require('angular-route');
  require('angular-bindonce');
  require('angular-bootstrap');
  require('elasticsearch');

  require('components/bind');
  require('components/bound_to_config_obj');
  require('components/chrome');
  require('components/config/config');
  require('components/courier/courier');
  require('components/debounce');
  require('components/doc_title/doc_title');
  require('components/elastic_textarea');
  require('components/errors');
  require('components/es');
  require('components/events');
  require('components/fancy_forms/fancy_forms');
  require('components/filter_bar/filter_bar');
  require('components/filter_manager/filter_manager');
  require('components/index_patterns/index_patterns');
  require('components/listen');
  require('components/modules');
  require('components/notify/notify');
  require('components/persisted_log/persisted_log');
  require('components/private');
  require('components/promises');
  require('components/state_management/app_state');
  require('components/state_management/global_state');
  require('components/storage/storage');
  require('components/stringify/register');
  require('components/style_compile/style_compile');
  require('components/timefilter/timefilter');
  require('components/timepicker/timepicker');
  require('components/tooltip/tooltip');
  require('components/typeahead/typeahead');
  require('components/url/url');
  require('components/validateDateInterval');
  require('components/validate_query/validate_query');
  require('components/watch_multi');

  var kibana = modules.get('kibana', [
    // list external requirements here
    'elasticsearch',
    'pasvaz.bindonce',
    'ngRoute',
    'ngClipboard',
    'ui.bootstrap'
  ]);

  kibana
  // This stores the Kibana revision number, @REV@ is replaced by grunt.
  .constant('kbnVersion', window.KIBANA_VERSION)
  // The build number is placed by grunt, represents a sequence to provide nothing really but order.
  // If NaN, use the max value of a JS number, that way we always have a number here, even in dev
  .constant('buildNum', window.KIBANA_BUILD_NUM)
  // the elasticserarch index where we will store saved objects and config
  .constant('kbnIndex', window.KIBANA_INDEX)
  // timeout config val specified in kibana.yml, passed from server
  .constant('esShardTimeout', window.ES_SHARD_TIMEOUT)
  // url we should use to talk to es
  .constant('esUrl', (function () {
    var a = document.createElement('a');
    a.href = 'elasticsearch';
    return a.href;
  }()))
  // This stores the build number, @REV@ is replaced by grunt.
  .constant('commitSha', window.KIBANA_COMMIT_SHA)
  // Use this for cache busting partials
  .constant('cacheBust', window.KIBANA_COMMIT_SHA)
  // The minimum Elasticsearch version required to run Kibana
  .constant('minimumElasticsearchVersion', '2.0.0')
  // When we need to identify the current session of the app, ef shard preference
  .constant('sessionId', Date.now())
  // attach the route manager's known routes
  .config(routes.config)
  .config(['ngClipProvider', function (ngClipProvider) {
    ngClipProvider.setPath('bower_components/zeroclipboard/dist/ZeroClipboard.swf');
  }]);

  // tell the modules util to add it's modules as requirements for kibana
  modules.link(kibana);

  return kibana;
});
