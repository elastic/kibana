'use strict';
var fs = require('fs');
var path = require('path');

var PREFIXES = ['', 'grunt-', 'grunt-contrib-'];
var EXTENSIONS = ['.coffee', '.js'];

var jit = {
  pluginsRoot: 'node_modules',
  mappings: {}
};


jit.findUp = function (cwd, iterator) {
  var result = iterator(cwd);
  if (result) {
    return result;
  }
  var parent = path.resolve(cwd, '..');
  return parent !== cwd ? jit.findUp(parent, iterator) : null;
};


jit.findPlugin = function (taskName) {
  var pluginName, taskPath;

  // Static Mappings
  if (this.mappings.hasOwnProperty(taskName)) {
    pluginName = this.mappings[taskName];
    if (pluginName.indexOf('/') >= 0 && pluginName.indexOf('@') !== 0) {
      taskPath = path.resolve(pluginName);
      if (fs.existsSync(taskPath)) {
        return jit.loadPlugin(taskName, taskPath, true);
      }
    } else {
      var dir = path.join(jit.pluginsRoot, pluginName, 'tasks');
      taskPath = jit.findUp(path.resolve(), function (cwd) {
        var findPath = path.join(cwd, dir);
        return fs.existsSync(findPath) ? findPath : null;
      });
      if (taskPath) {
        return jit.loadPlugin(pluginName, taskPath);
      }
    }
  }

  // Custom Tasks
  if (jit.customTasksDir) {
    for (var i = EXTENSIONS.length; i--;) {
      taskPath = path.join(jit.customTasksDir, taskName + EXTENSIONS[i]);
      if (fs.existsSync(taskPath)) {
        return jit.loadPlugin(taskName, taskPath, true);
      }
    }
  }

  // Auto Mappings
  var dashedName = taskName.replace(/([A-Z])/g, '-$1').replace(/_+/g, '-').toLowerCase();
  taskPath = jit.findUp(path.resolve(), function (cwd) {
    for (var p = PREFIXES.length; p--;) {
      pluginName = PREFIXES[p] + dashedName;
      var findPath = path.join(cwd, jit.pluginsRoot, pluginName, 'tasks');
      if (fs.existsSync(findPath)) {
        return findPath;
      }
    }
  });
  if (taskPath) {
    return jit.loadPlugin(pluginName, taskPath);
  }

  var log = jit.grunt.log.writeln;
  log();
  log('jit-grunt: Plugin for the "'.yellow + taskName.yellow + '" task not found.'.yellow);
  log('If you have installed the plugin already, please setting the static mapping.'.yellow);
  log('See'.yellow, 'https://github.com/shootaroo/jit-grunt#static-mappings'.cyan);
  log();
};


jit.loadPlugin = function (name, path, isFile) {
  var grunt = jit.grunt;
  var _write = grunt.log._write;
  var _nameArgs = grunt.task.current.nameArgs;
  grunt.task.current.nameArgs = 'loading ' + name;
  if (jit.hideHeader) {
    grunt.log._write = function () {};
  }
  grunt.log.header('Loading "' + name + '" plugin');
  grunt.log._write = _write;

  if (isFile) {
    var fn = require(path);
    if (typeof fn === 'function') {
      fn.call(grunt, grunt);
    }
  } else {
    grunt.loadTasks(path);
  }
  grunt.task.current.nameArgs = _nameArgs;
};


jit.proxy = function (name) {
  return {
    task: {
      name: name,
      fn: function () {
        var thing = jit._taskPlusArgs.call(jit.grunt.task, name);
        if (!thing.task) {
          jit.findPlugin(thing.args[0]);
          thing = jit._taskPlusArgs.call(jit.grunt.task, name);
          if (!thing.task) {
            return new Error('Task "' + name + '" failed.');
          }
        }

        this.nameArgs = thing.nameArgs;
        this.name = thing.task.name;
        this.args = thing.args;
        this.flags = thing.flags;
        return thing.task.fn.apply(this, this.args);
      }
    },
    nameArgs: name,
    args: null,
    flags: null
  };
};


module.exports = function factory(grunt, mappings) {
  if (!jit.grunt) {
    jit.grunt = grunt;
    jit.hideHeader = !grunt.option('verbose');

    // Override _taskPlusArgs
    jit._taskPlusArgs = grunt.util.task.Task.prototype._taskPlusArgs;
    grunt.util.task.Task.prototype._taskPlusArgs = jit.proxy;
  }

  for (var key in mappings) {
    if (mappings.hasOwnProperty(key)) {
      jit.mappings[key] = mappings[key];
    }
  }

  return jit;
};
