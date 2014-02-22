define(function (require) {
  var angular = require('angular');

  /**
   * broke this out so that it could be loaded before the application is
   */
  angular.module('kibana/constants')
    // This stores the Kibana revision number, @REV@ is replaced by grunt.
    .constant('kbnVersion', '@REV@')

    // Use this for cache busting partials
    .constant('cacheBust', 'cache-bust=' + Date.now())

    ;
});