define(function (require) {
  /**
   * broke this out so that it could be loaded before the application is
   */
  require('modules')
    .get('kibana/constants')

    // This stores the Kibana revision number, @REV@ is replaced by grunt.
    .constant('kbnVersion', '@REV@')

    // Use this for cache busting partials
    .constant('cacheBust', 'cache-bust=' + Date.now());
});