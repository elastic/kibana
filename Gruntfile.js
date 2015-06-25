module.exports = function (grunt) {
  // set the config once before calling load-grunt-config
  // and once durring so that we have access to it via
  // grunt.config.get() within the config files
  var config = {
    pkg: grunt.file.readJSON('package.json'),
    root: __dirname,
    src: __dirname + '/src',
    build: __dirname + '/build', // temporary build directory
    plugins: __dirname + '/src/plugins',
    server: __dirname + '/src/KbnServer',
    target: __dirname + '/target', // location of the compressed build targets
    configFile: __dirname + '/src/config/kibana.yml',

    nodeVersion: '0.10.35',
    platforms: ['darwin-x64', 'linux-x64', 'linux-x86', 'windows'],
    services: [ [ 'launchd', '10.9'], [ 'upstart', '1.5'], [ 'systemd', 'default'], [ 'sysv', 'lsb-3.1' ] ],

    unitTestDir: __dirname + '/test/unit',
    testUtilsDir: __dirname + '/test/utils',
    bowerComponentsDir: __dirname + '/bower_components',

    devPlugins: 'vis_debug_spy',

    meta: {
      banner: '/*! <%= package.name %> - v<%= package.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '<%= package.homepage ? " * " + package.homepage + "\\n" : "" %>' +
        ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= package.author.company %>;' +
        ' Licensed <%= package.license %> */\n'
    },
    lintThese: [
      'Gruntfile.js',
      '<%= root %>/tasks/**/*.js',
      '<%= src %>/**/*.js',
      '<%= unitTestDir %>/**/*.js',
      '!<%= unitTestDir %>/specs/vislib/fixture/**/*'
    ],
    lessFiles: [
      '<%= src %>/**/*.less',
      '!<%= src %>/**/_*.less'
    ]
  };

  grunt.config.merge(config);

  var dirname = require('path').dirname;
  var indexFiles = grunt.file.expand({ cwd: 'src/kibana/plugins' }, [
    '*/index.js',
    '!' + config.devPlugins + '/index.js'
  ]);
  var moduleIds = indexFiles.map(function (fileName) {
    return 'plugins/' + dirname(fileName) + '/index';
  });

  config.bundled_plugin_module_ids = grunt.bundled_plugin_module_ids = moduleIds;

  // load plugins
  require('load-grunt-config')(grunt, {
    configPath: __dirname + '/tasks/config',
    init: true,
    config: config
  });

  // load task definitions
  grunt.task.loadTasks('tasks');
};
