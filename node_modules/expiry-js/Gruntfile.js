module.exports = function (grunt) {

  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({

    pkg: grunt.file.readJSON('./package.json'),

    clean: [ 'dist' ],

    concat: {
      dist: {
        options: {
          banner: grunt.file.read('./build/banner.js'),
          footer: grunt.file.read('./build/footer.js')
        },
        src: [
          'lib/Expiry.js'
        ],
        dest: 'dist/expiry.js'
      }
    },

    uglify: {
      options: {
        preserveComments: false
      },
      dist: {
        files: {
          'dist/expiry.min.js': 'dist/expiry.js'
        }
      }
    }
  });

  grunt.registerTask('dist', [ 'clean', 'concat', 'uglify' ]);
}
