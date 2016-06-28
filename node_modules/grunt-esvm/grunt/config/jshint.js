module.exports = function (grunt) {
  return {
    all: [
      'Gruntfile.js',
      'tasks/*.js',
      'grunt/tasks/**/*.js'
    ],
    options: {
      jshintrc: '.jshintrc'
    }
  };
};