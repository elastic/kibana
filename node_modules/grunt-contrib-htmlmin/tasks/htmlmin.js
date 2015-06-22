/*
 * grunt-contrib-htmlmin
 * http://gruntjs.com/
 *
 * Copyright (c) 2012 Sindre Sorhus, contributors
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function (grunt) {
  var minify = require('html-minifier').minify;
  var helper = require('grunt-lib-contrib').init(grunt);

  grunt.registerMultiTask('htmlmin', 'Minify HTML', function () {
    var options = this.options();
    grunt.verbose.writeflags(options, 'Options');

    this.files.forEach(function (file) {
      var min;
      var max = file.src.filter(function (filepath) {
        // Warn on and remove invalid source files (if nonull was set).
        if (!grunt.file.exists(filepath)) {
          grunt.log.warn('Source file "' + filepath + '" not found.');
          return false;
        } else {
          return true;
        }
      })
      .map(grunt.file.read)
      .join(grunt.util.normalizelf(grunt.util.linefeed));

      try {
        min = minify(max, options);
      } catch (err) {
        grunt.warn(file.src + '\n' + err);
      }

      if (min.length < 1) {
        grunt.log.warn('Destination not written because minified HTML was empty.');
      } else {
        grunt.file.write(file.dest, min);
        grunt.log.writeln('File ' + file.dest + ' created.');
        helper.minMaxInfo(min, max);
      }
    });
  });
};
