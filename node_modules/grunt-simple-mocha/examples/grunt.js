module.exports = function(grunt) {
  grunt.initConfig({
    simplemocha: {
      all: {
        src: 'test/**/*.js',
        options: {
          globals: ['should'],
          timeout: 3000,
          ignoreLeaks: false,
          grep: '*-test',
          ui: 'bdd',
          reporter: 'tap'
        }
      }
    }
  });

  // For this to work, you need to have run `npm install grunt-simple-mocha`
  grunt.loadNpmTasks('grunt-simple-mocha');

  // Add a default task.
  grunt.registerTask('default', 'simplemocha');
};
