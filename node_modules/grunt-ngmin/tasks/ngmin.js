'use strict';

var ngmin = require('ngmin');

module.exports = function (grunt) {

  grunt.registerMultiTask('ngmin', 'Annotate AngularJS scripts for minification', function () {

    grunt.log.writeln('ngminifying ' + grunt.log.wordlist(this.files.map(function (file) {
      return file.src;
    })));

    this.files.forEach(function (file) {
      var contents = file.src
        .map(grunt.file.read)
        .map(ngmin.annotate)
        .join('');
      grunt.file.write(file.dest, contents);
    });

  });
};
