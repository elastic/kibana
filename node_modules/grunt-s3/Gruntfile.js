var path = require('path');

module.exports = function (grunt) {

  grunt.initConfig({
    jshint: ['tasks/**/*.js'],
    nodeunit: {
      all: ['test/upload.js', 'test/download.js', 'test/delete.js', 'test/s3Task.js', 'test/sync.js']
    },
    clean: [ 's3/'],
    s3: {
      options: {
        key: 'abc',
        secret: 'def',
        bucket: 'test',
        endpoint: '127.0.0.1',
        port: 1337,
        secure: false,
        access: 'public-read',
        style: 'path'
      },
      test: {
        options: {}
      },
      test_options: {
        options: {
          key: 'custom'
        }
      },
      test_S3Task: {
        upload: [{
          src: path.join(process.cwd(), 'test', 'files', '**', '*.txt'),
          rel: path.join(process.cwd(), 'test', 'files'),
          options: {
            bucket: 'overridden'
          }
        }]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('test', ['clean', 'jshint', 'nodeunit']);

  grunt.loadTasks(__dirname + '/tasks');
};
