'use strict';

module.exports = function (grunt) {
  var _ = require('underscore');
  var LIVERELOAD_PORT = 35729;
  var mountFolder = function (connect, dir) {
    return connect.static(require('path').resolve(dir));
  };
  

  // load plugins
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);
  grunt.loadNpmTasks('assemble-less');

  // Find artifacts source and minified version
  var copy_manifest = grunt.file.readJSON('copy_manifest.js');
  _.flatMap = _.compose(_.flatten, _.map);
  function copy_dep(env) {
    var dev = "dev" === env;
    return _.flatMap(copy_manifest,function(dependencies,packager){
      return _.flatMap(dependencies,function(o, name){
        var artifact;
        if (dev) {
          artifact = o.src || o.min;
        } else {
          artifact = o.min || o.src;
        }
        return {
          flatten: (o.flatten || false ),
          expand: true,
          cwd: packager + '/' + name + '/' + ( o.cwd || "" ),
          src: artifact,
          dest: "dist/" + name + "/" + ( o.dest || "" ),
          rename: function(dest,src) {
            if(dev) {
              return dest + src.replace("-src.js",".js");
            } else {
              return  dest + src.replace(".min.",".").replace("-min.",".");
            }
            
          }
        };
      });
    });
  };

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
              require('connect-livereload')({port: LIVERELOAD_PORT}),
              mountFolder(connect, '.tmp'),
              mountFolder(connect, '.')
            ];
          }
        }
      }
    },
    copy : {
      bootstrap: {
        files: [
          {expand: true, cwd: 'css/bootstrap-override/', src: "*.less", dest: 'bower_components/bootstrap/less/'}
        ]
      },
      dev: {files: copy_dep("dev")},
      dist: {files: copy_dep("dist")}
    },
    clean: {
      all: {
        files:[{
          src: [
            '.tmp',
            'dist/*'
          ]
        }]
      }
    },
    jshint: {
      files: ['Gruntfile.js', 'js/*.js', 'panels/*/*.js' ],
      options: {
        bitwise: true, maxlen: 140, curly: true, eqeqeq: true, immed: true, indent: 2,
        latedef: true, newcap: true, noarg: true, sub: true, undef: true, boss: true,
        eqnull: true, globalstrict: true, devel: true, node: true,
        globals: {
          '$LAB': false, '_': false, '$': false, 'kbn' : false, window: false,
          document: false, exports: true, module: false, config: false, moment: false
        }
      }
    },
    less: {
      bootstrap: {
        options: {
          paths: ["bower_components/bootstrap/less/"],
        },
        files: {
          "dist/bootstrap/css/dark.css": "bower_components/bootstrap/less/bootstrap.dark.less",
          "dist/bootstrap/css/light.css": "bower_components/bootstrap/less/bootstrap.light.less"
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
    watch: {
      livereload: {
        options: {
          livereload: LIVERELOAD_PORT
        },
        files: [
          "index.html",
          "panels/*/*.{html,js}",
          "partials/*.html",
          "js/*.js"
        ]
      }
    }
  });

  grunt.registerTask('dist', [
    'clean:all',
    'copy:dist',
    'copy:bootstrap',
    'less:bootstrap'
  ]);

  grunt.registerTask('server', [
      'clean:all',
      'copy:dist',
      'copy:bootstrap',
      'less:bootstrap',
      'connect:livereload',
      'open',
      'watch'
  ]);
};