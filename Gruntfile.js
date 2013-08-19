'use strict';
var LIVERELOAD_PORT = 35729;
var lrSnippet = require('connect-livereload')({
  port: LIVERELOAD_PORT
});
var mountFolder = function(connect, dir) {
  return connect.static(require('path').resolve(dir));
};


module.exports = function (grunt) {

  var post = ['src/client.js','src/post.js'];
  var webapp = './';

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    meta: {
      banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '<%= pkg.homepage ? " * " + pkg.homepage + "\\n" : "" %>' +
        ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
        ' Licensed <%= pkg.license %> */\n\n'
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
    connect: {
      options: {
        port: 9000,
        // Change this to '0.0.0.0' to access the server from outside.
        // hostname: '0.0.0.0'
      },
      livereload: {
        options: {
          middleware: function(connect) {
            return [
              lrSnippet,
              mountFolder(connect, webapp),
            ];
          }
        }
      },
    },
    watch: {
      options: {
        livereload: LIVERELOAD_PORT,
        nospawn: true,
      },
      reloadassets: {
        files: [
          webapp + '*.html',
          webapp + 'partials/*.html',
          webapp + 'panels/**/*.{html,js}',
          webapp + 'js/*.js',
          webapp + 'common/**/*.{html,css,js,png,gif}',
        ]
      },    
    }
  });

  // load plugins
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('assemble-less');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-connect');


  // Default task.
  grunt.registerTask('default', ['jshint','less']);
  grunt.registerTask('server', function() {
    grunt.task.run([
      'connect:livereload',
      'watch'
    ]);
  });
};
