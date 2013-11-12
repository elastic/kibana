/* jshint node:true */
'use strict';
module.exports = function (grunt) {

  var config = {
    pkg: grunt.file.readJSON('package.json'),
    kibanaDir: 'kibana',
    destDir: 'dist',
    tempDir: 'tmp',
    meta: {
      banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '<%= pkg.homepage ? " * " + pkg.homepage + "\\n" : "" %>' +
        ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
        ' Licensed <%= pkg.license %> */\n\n'
    },
    clean: {
      on_start: ['<%= destDir %>', '<%= tempDir %>'],
      temp: ['<%= tempDir %>'],
      setup: ['<%= kibanaDir %>']
    },
    gitclone: {
      kibana: {
        options: {
          repository: 'https://github.com/elasticsearch/kibana.git'
        }
      }
    },
    copy: {
      // copy source to temp, we will minify in place for the dist build
      marvel_config: {
        cwd: '.',
        src: ['config.js'],
        dest: '<%= kibanaDir %>/src/'
      }
    },
  };

  // Run jshint
  grunt.registerTask('default', [
  ]);

  grunt.registerTask('setup', [
    'clean:setup',
    'gitclone:kibana',
    'copy:marvel_config'
  ]);

  // Concat and Minify the src directory into dist
  grunt.registerTask('build', [
    'jshint:source',
    'clean:on_start',
    'less:dist',
    'copy:everything_but_less_to_temp',
    'htmlmin:build',
    'cssmin:build',
    'ngmin:build',
    'requirejs:build',
    'clean:temp',
    'build:write_revision',
    'uglify:dest'
  ]);

  // build, then zip and upload to s3
  grunt.registerTask('distribute', [
    'distribute:load_s3_config',
    'build',
    'compress:zip',
    'compress:tgz',
    's3:dist',
    'clean:temp'
  ]);

  // build, then zip and upload to s3
  grunt.registerTask('release', [
    'distribute:load_s3_config',
    'build',
    'compress:zip_release',
    'compress:tgz_release',
    's3:release',
    'clean:temp'
  ]);

  // load plugins
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-git');
  grunt.loadNpmTasks('grunt-symlink');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-string-replace');
  grunt.loadNpmTasks('grunt-contrib-compress');


  // pass the config to grunt
  grunt.initConfig(config);

};