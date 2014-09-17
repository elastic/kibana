module.exports = function (grunt) {
  // set the config once before calling load-grunt-config
  // and once durring so that we have access to it via
  // grunt.config.get() within the config files
  var config = {
    pkg: grunt.file.readJSON('package.json'),
    root: __dirname,
    src: __dirname + '/src', // unbuild version of build
    build: __dirname + '/build', // copy of source, but optimized
    app: __dirname + '/src/kibana', // source directory for the app
    target: __dirname + '/target',  // location of the compressed build targets
    buildApp: __dirname + '/build/kibana', // build directory for the app

    jrubyVersion: '1.7.14',
    jrubyPath: __dirname + '/.jruby',

    unitTestDir: __dirname + '/test/unit',
    testUtilsDir: __dirname + '/test/utils',
    bowerComponentsDir: __dirname + '/src/kibana/bower_components',

    meta: {
      banner: '/*! <%= package.name %> - v<%= package.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '<%= package.homepage ? " * " + package.homepage + "\\n" : "" %>' +
        ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= package.author.company %>;' +
        ' Licensed <%= package.license %> */\n'
    }
  };

  grunt.config.merge(config);

  // load plugins
  require('load-grunt-config')(grunt, {
    configPath: __dirname + '/tasks/config',
    init: true,
    config: config
  });

  // load task definitions
  grunt.task.loadTasks('tasks');
};
