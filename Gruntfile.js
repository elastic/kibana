/* jshint node:true */
'use strict';
module.exports = function (grunt) {

  var config = {
    pkg: grunt.file.readJSON('package.json'),
    kibanaCheckoutDir: './vendor/kibana',
    kibanaRevision: 'master',
    exporterDir: 'exporter',
    buildDir: 'build',
    packageDir: 'build/packages',
    esPort: {
      dev: '":'+ (grunt.option('es_port') ||  9200) +'"',
      dist: "(window.location.port !== '' ? ':'+window.location.port : '')"
    },
    statsReportUrl: {
      dev: '"http://" + window.location.hostname + ":'+ (grunt.option('es_port') ||  9200) +'/.marvel_cluster_report/report"',
      dist: '""' //TODO: INSERT URL
    },
    defaultRoute: {
      dev: '/dashboard/file/marvel.overview.json',
      dist: '/dashboard/elasticsearch/Marvel%20-%20Overview'
    },
    kibanaPort: grunt.option('port') ||  5601,
    kibanaHost: 'localhost'

  };

  // more detailed config
  config['buildTempDir'] = config['buildDir'] + '/tmp'; // kibana and custom panels will be merged here
  config['buildSiteDir'] = config['buildDir'] + '/_site';  // compressed minified marvel site will be outputted here

  // Utility function to load plugin settings into the above config object
  function loadConfig(config, path) {
    require('glob').sync('*', {cwd: path}).forEach(function (option) {
      var key = option.replace(/\.js$/, '');
      // Merge duplicate plugin configs. It is your responsibility to avoid naming collisions
      // in tasks
      config[key] = config[key] || {};
      grunt.util._.extend(config[key], require(path + option)(config, grunt));
    });
    return config;
  }

  // load plugins
  require('load-grunt-tasks')(grunt);

  // Load Marvel tasks. Identical task names will override kibana tasks
  grunt.loadTasks('tasks');
  loadConfig(config, './tasks/options/');

  // pass the config to grunt
  grunt.initConfig(config);

};