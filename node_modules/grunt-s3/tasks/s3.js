/*jshint esnext:true*/
/*globals module:true, require:true, process:true*/

/*
 * Grunt Task File
 * ---------------
 *
 * Task: S3
 * Description: Move files to and from s3
 * Dependencies: knox, underscore.deferred
 *
 */

var s3 = require('./lib/s3');

var exportFn = function (grunt) {
  var S3Task = require('./lib/S3Task');

  // If grunt is not provided, then expose internal API.
  if (typeof grunt !== 'object') {
    return {
      s3: s3,
      S3Task: S3Task
    };
  }

  s3 = s3.init(grunt);

  /**
   * Transfer files to/from s3.
   *
   * Uses global s3 grunt config.
   */
  grunt.registerMultiTask('s3', 'Publishes files to s3.', function () {
    var task = new S3Task(this, s3);

    task.run();
  });
};

exportFn.init = function (grunt) {
  return s3.init(grunt);
};

module.exports = exportFn;
