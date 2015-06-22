/*
 * grunt-express-server
 * https://github.com/ericclemmons/grunt-express-server
 *
 * Copyright (c) 2013 Eric Clemmons
 * Licensed under the MIT license.
 */

'use strict';

var path = require('path');

module.exports = function(grunt) {

  var servers = {};

  grunt.registerMultiTask('express', 'Start an express web server', function() {
    if (!servers[this.target]) {
      servers[this.target] = require('./lib/server')(grunt, this.target);
    }

    var server  = servers[this.target];
    var action  = this.args.shift() || 'start';
    var options = this.options({
      cmd:           process.argv[0],
      opts:          [ ],
      args:          [ ],
      node_env:      undefined,
      background:    true,
      fallback:      function() { /* Prevent EADDRINUSE from breaking Grunt */ },
      port:          process.env.PORT || 3000,
      delay:         0,
      output:        ".+",
      debug:         false
    });

    options.script = path.resolve(options.script);

    options.args.unshift(options.script);

    if (!grunt.file.exists(options.script)) {
      grunt.log.error('Could not find server script: ' + options.script);

      return false;
    }

    server[action](options);
  });
};
