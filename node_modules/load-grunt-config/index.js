var gruntConfig = require('./lib/gruntconfig');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');

var cwd = process.cwd();
var defaults = {
  configPath: [ path.join(cwd, 'grunt') ],
  init: true,
  jitGrunt: false,
  loadGruntTasks: {
  },
  data: {},
  mergeFunction: _.merge
};

module.exports = function(grunt, options) {
  var debugOnly = process.argv.indexOf('--config-debug') > -1;

  options = options || {};
  if (options.config) {
    options.data = options.config;
    delete options.config;
  }
  var opts = _.merge({}, defaults, options, options.data);

  var packageJsonPath = path.join(cwd, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    var packageData = require(packageJsonPath);
    opts.data.package = packageData;
  }

  var config = gruntConfig(grunt, opts);

  if (typeof options.preMerge === 'function') {
    options.preMerge(config, opts.data);
  }

  config = _.merge({}, config, opts.data);

  if (typeof options.postProcess === 'function') {
    options.postProcess(config);
  }

  if (debugOnly){
    console.log('CONFIG:');
    console.log('==============================');
    console.log(JSON.stringify(config, null, 2));
    console.log('');
    if (config.aliases) {
      console.log('ALIASES:');
      console.log('==============================');
      for (var cTaskName in config.aliases) {
        var cTask = config.aliases[cTaskName];
        console.log(cTaskName + ' ' + JSON.stringify(cTask));
      }
      console.log('');
    }
    process.exit(0);
  }

  if (opts.init) {
    grunt.initConfig(config);
  }

  if (opts.jitGrunt === false && opts.loadGruntTasks) {
    require('load-grunt-tasks')(grunt, opts.loadGruntTasks);
  } else if (opts.jitGrunt) {
    require('jit-grunt')(grunt, opts.jitGrunt.staticMappings)(opts.jitGrunt);
  }

  if (config.aliases) {
    var getTaskRunner = function (tasks) {
      return function () {
        grunt.task.run(tasks);
      };
    };

    for (var taskName in config.aliases) {
      var task = config.aliases[taskName];

      // The task variable contains the task to register, the alias has no description
      if (typeof task === 'string' || typeof task === 'function' || Array.isArray(task)) {
        grunt.registerTask(taskName, task);

      // The task variable is an object with two properties: tasks and description 
      } else {

        //  * The tasks property is a function, it can be register directly using registerTask
        if (typeof task.tasks === 'function') {
          grunt.registerTask(taskName, task.description, task.tasks);

        //  * The tasks property is not a function, it must be wrapped inside one
        } else {
          grunt.registerTask(taskName, task.description, getTaskRunner(task.tasks));  
        }

      }
    }
  }

  return config;
};
