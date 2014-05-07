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
      testUtilsDir: __dirname + '/test/utils',
      bowerComponentsDir: __dirname + '/src/bower_components',

      k4d3Repo: 'git@github.com:elasticsearch/K4D3.git',
      k4d3Dir: '<%= bowerComponentsDir %>/K4D3',
      esjsRepo: 'git@github.com:elasticsearch/elasticsearch-js.git',
      esjsDir: '<%= bowerComponentsDir %>/elasticsearch',

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