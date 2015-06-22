/*
 * grunt-open
 * https://github.com/joverson/grunt-open
 *
 * Copyright (c) 2012 Jarrod Overson
 * Licensed under the MIT license.
 */

'use strict';

var open = require('open');

module.exports = function(grunt) {
  grunt.registerMultiTask('open', 'Open urls and files from a grunt task', function() {
    var dest = this.data.url || this.data.file || this.data.path;
    dest = typeof dest === 'function' ? dest() : dest;
    var application = this.data.app || this.data.application;
    var options = this.options();

    function callback(error){
    if (error !== null)
      grunt.fail.warn(error);
    }

    options.delay = options.delay || 0;

    // allows to wait for server start up before opening
    var openOn = options.openOn;
    if (openOn) {
      grunt.event.on(openOn, function () {
        open(dest, application, callback);
      });
    } else {
      setTimeout(function(){
        open(dest, application, callback);
      }, options.delay);
    }

    // give the spawn some time before its parent (us) dies
    // https://github.com/onehealth/grunt-open/issues/6
    setTimeout(this.async(), 200);
  });
};
