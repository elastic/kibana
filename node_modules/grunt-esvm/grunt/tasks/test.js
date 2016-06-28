module.exports = function (grunt) {
  grunt.registerTask('test', [
    'jshint',
    'mochaTest'
  ]);
};