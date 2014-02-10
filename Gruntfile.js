/* jshint node:true */
module.exports = function (grunt) {
  // load plugins
  require('load-grunt-config')(grunt, {
    configPath: __dirname + '/tasks/config',
    init: true,
    config: {
      root: __dirname,
      src: __dirname + '/src',
      app: __dirname + '/src/kibana',
      unitTestDir: __dirname + '/test/unit',
      meta: {
        banner: '/*! <%= package.name %> - v<%= package.version %> - ' +
          '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
          '<%= package.homepage ? " * " + package.homepage + "\\n" : "" %>' +
          ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= package.author.company %>;' +
          ' Licensed <%= package.license %> */\n'
      }
    }
  });

  // load task definitions
  grunt.loadTasks('tasks');
};