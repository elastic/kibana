module.exports = function (grunt) {
  require('jit-grunt')(grunt);

  grunt.initConfig({
    pkg: require('./package.json'),

    clean: {
      build: {
        src: 'build'
      }
    },

    compress: {
      build: {
        options: {
          archive: 'target/sense-<%= pkg.version %>.zip'
        },
        files: [
          { src: ['build/**'], dest: '/' },
        ]
      }
    },

    copy: {
      build: {
        files: [
          {
            expand: true,
            src: [
              'public/**',
              'api_server/**',
              'index.js',
              'LICENSE.md',
              'package.json',
              'README.md',
            ],
            dest: 'build/'
          },
        ]
      }
    }
  });

  grunt.registerTask('build', [
    'clean:build',
    'copy:build',
    'compress:build'
  ]);

};
