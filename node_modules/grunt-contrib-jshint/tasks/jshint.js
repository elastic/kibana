/*
 * grunt-contrib-jshint
 * http://gruntjs.com/
 *
 * Copyright (c) 2013 "Cowboy" Ben Alman, contributors
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  var path = require('path');
  var jshint = require('./lib/jshint').init(grunt);

  grunt.registerMultiTask('jshint', 'Validate files with JSHint.', function() {
    var done = this.async();

    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options({
      force: false,
      reporterOutput: null,
    });

    // log (verbose) options before hooking in the reporter
    grunt.verbose.writeflags(options, 'JSHint options');

    // Report JSHint errors but dont fail the task
    var force = options.force;
    delete options.force;

    // Whether to output the report to a file
    var reporterOutput = options.reporterOutput;
    delete options.reporterOutput;

    // Hook into stdout to capture report
    var output = '';
    if (reporterOutput) {
      grunt.util.hooker.hook(process.stdout, 'write', {
        pre: function(out) {
          output += out;
          return grunt.util.hooker.preempt();
        }
      });
    }

    jshint.lint(this.filesSrc, options, function(results, data) {
      var failed = 0;
      if (results.length > 0) {
        // Fail task if errors were logged except if force was set.
        failed = force;
      } else {
        if (jshint.usingGruntReporter === true && data.length > 0) {
          grunt.log.ok(data.length + ' file' + (data.length === 1 ? '' : 's') + ' lint free.');
        }
      }

      // Write the output of the reporter if wanted
      if (reporterOutput) {
        grunt.util.hooker.unhook(process.stdout, 'write');
        reporterOutput = grunt.template.process(reporterOutput);
        var destDir = path.dirname(reporterOutput);
        if (!grunt.file.exists(destDir)) {
          grunt.file.mkdir(destDir);
        }
        grunt.file.write(reporterOutput, output);
        grunt.log.ok('Report "' + reporterOutput + '" created.');
      }

      done(failed);
    });
  });

};
