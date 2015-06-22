'use strict';

var path = require('path');
var googlecdn = require('google-cdn');
var bowerConfig = require('bower').config;


module.exports = function (grunt) {

  grunt.registerMultiTask('cdnify', 'replace scripts with refs to the Google CDN', function () {
    // collect files
    var files = grunt.file.expand({ filter: 'isFile' }, this.data.html);
    var compJson = grunt.file.readJSON(bowerConfig.json);

    // Strip the leading path segment off, e.g. `app/bower_components` ->
    // `bower_components`
    var bowerDirBits = bowerConfig.directory.split(path.sep);
    bowerDirBits.shift();
    var componentsPath = bowerDirBits.join(path.sep);

    grunt.log
      .writeln('Going through ' + grunt.log.wordlist(files) + ' to update script refs');

    files = files.map(function (filepath) {
      return {
        path: filepath,
        body: grunt.file.read(filepath)
      };
    });

    files.forEach(function (file) {
      var content = file.body;

      content = googlecdn(content, compJson, { componentsPath: componentsPath });
      grunt.file.write(file.path, content);
    });
  });
};
