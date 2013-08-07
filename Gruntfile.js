'use strict';

module.exports = function (grunt) {

  var post = ['src/client.js','src/post.js'];
  var LIVERELOAD_PORT = 35729;
  var mountFolder = function (connect, dir) {
    return connect.static(require('path').resolve(dir));
  };

  // load plugins
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);
  grunt.loadNpmTasks('assemble-less');

  // Project configuration.
  grunt.initConfig({
    connect: {
      options: {
        port: 9000,
        hostname: '0.0.0.0'
      },
      livereload: {
        options: {
          middleware: function (connect) {
            return [
              require('connect-livereload')({ port: LIVERELOAD_PORT }),
              mountFolder(connect, '.tmp'),
              mountFolder(connect, '.')
            ];
          }
        }
      }
    },
    jshint: {
      files: ['Gruntfile.js', 'js/*.js', 'panels/*/*.js' ],
      options: {
        bitwise: true,
        maxlen: 140,
        curly: true,
        eqeqeq: true,
        immed: true,
        indent: 2,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        globalstrict: true,
        devel: true,
        node: true,
        globals: {
          '$LAB': false,
          '_': false,
          '$': false,
          'kbn' : false,
          window: false,
          document: false,
          exports: true,
          module: false,
          config: false,
          moment: false
        }
      }
    },
    less: {
      production: {
        options: {
          paths: ["vendor/bootstrap/less"],
          yuicompress:true
        },
        files: {
          "common/css/bootstrap.dark.min.css": "vendor/bootstrap/less/bootstrap.dark.less",
          "common/css/bootstrap.light.min.css": "vendor/bootstrap/less/bootstrap.light.less"
        }
      }
    },
    pkg: grunt.file.readJSON('package.json'),
    meta: {
      banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '<%= pkg.homepage ? " * " + pkg.homepage + "\\n" : "" %>' +
        ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
        ' Licensed <%= pkg.license %> */\n\n'
    },
    open: {
      server: {
        url: 'http://localhost:<%= connect.options.port %>'
      }
    },
    clean: {
      server: '.tmp'
    },
    watch: {
      livereload: {
        options: {
          livereload: LIVERELOAD_PORT
        },
        files: [
          "index.html",
          "panels/*/*.{html,js}",
          "partials/*.html"
        ]
      }
    }
  });

  // Default task.
  grunt.registerTask('default', ['jshint','less']);

  grunt.registerTask('server', function (target) {
    grunt.task.run([
      'clean:server',
      'connect:livereload',
      'open',
      'watch'
    ]);
  });

};
