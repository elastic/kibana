/**
 * main app level module
 */
define(function (require) {
  var modules = require('modules');
  var routes = require('routes');

  var kibana = modules.get('kibana', [
    // list external requirements here
    'elasticsearch',
    'pasvaz.bindonce',
    'ngRoute',
    'ui.bootstrap'
  ]);

  var payload = window.KIBANA;

  kibana
  // This stores the Kibana revision number, @REV@ is replaced by grunt.
  .constant('kbnVersion', payload.version)
  // The build number is placed by grunt, represents a sequence to provide nothing really but order.
  // If NaN, use the max value of a JS number, that way we always have a number here, even in dev
  .constant('buildNum', payload.buildNumber)
  // the elasticserarch index where we will store saved objects and config
  .constant('kbnIndex', payload.kbnIndex)
  // timeout config val specified in kibana.yml, passed from server
  .constant('esShardTimeout', payload.esShardTimeout)
  // url we should use to talk to es
  .constant('esUrl', (function () {
    var a = document.createElement('a');
    a.href = '/elasticsearch';
    return a.href;
  }()))
  // This stores the build number, @REV@ is replaced by grunt.
  .constant('commitSha', payload.buildSha)
  // Use this for cache busting partials
  .constant('cacheBust', payload.cacheBust)
  // The minimum Elasticsearch version required to run Kibana
  .constant('minimumElasticsearchVersion', '2.0.0')
  // When we need to identify the current session of the app, ef shard preference
  .constant('sessionId', Date.now())
  // attach the route manager's known routes
  .config(routes.config)
  .config(function ($tooltipProvider) {
    $tooltipProvider.setTriggers({ 'mouseenter': 'mouseleave click' });
  });

  // tell the modules util to add it's modules as requirements for kibana
  modules.link(kibana);

  return kibana;
});
