module.exports = function (grunt) {

  grunt.registerTask('build', [
    'clean:build',
    'clean:target',
    'eslint:source',
    'copy:build',
    'gitinfo',
    'replace:build',
    'compress:build'
  ]);

};
