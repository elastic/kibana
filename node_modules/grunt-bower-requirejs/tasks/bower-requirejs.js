'use strict';
var bowerRequireJS = require('bower-requirejs');

module.exports = function (grunt) {
  grunt.registerMultiTask('bower', 'Wire-up Bower components in RJS config', function () {
    var options = this.options({
        config: this.data.rjsConfig,
        exclude: [],
        baseUrl: '',
        transitive: false,
        excludeDev: false
    });

    options['exclude-dev'] = options.excludeDev;

    bowerRequireJS(options, this.async());
  });
};
