var fs = require('fs');
var path = require('path');


function getStamp(dir, name, target) {
  return path.join(dir, name, target, 'timestamp');
}

var counter = 0;
var configCache = {};

function cacheConfig(config) {
  ++counter;
  configCache[counter] = config;
  return counter;
}

function pluckConfig(id) {
  if (!configCache.hasOwnProperty(id)) {
    throw new Error('Failed to find id in cache');
  }
  var config = configCache[id];
  delete configCache[id];
  return config;
}


function createTask(grunt, any) {
  return function(name, target) {
    var tasks = [];
    var prefix = this.name;
    if (!target) {
      Object.keys(grunt.config(name)).forEach(function(target) {
        if (!/^_|^options$/.test(target)) {
          tasks.push(prefix + ':' + name + ':' + target);
        }
      });
      return grunt.task.run(tasks);
    }
    var args = Array.prototype.slice.call(arguments, 2).join(':');
    var options = this.options({
      timestamps: path.join(__dirname, '..', '.cache')
    });
    var config = grunt.config.get([name, target]);
    var id = cacheConfig(config);
    config = grunt.util._.clone(config);

    /**
     * Special handling for watch task.  This is a multitask that expects
     * the `files` config to be a string or array of string source paths.
     */
    var srcFiles = true;
    if (typeof config.files === 'string') {
      config.src = [config.files];
      delete config.files;
      srcFiles = false;
    } else if (Array.isArray(config.files) &&
        typeof config.files[0] === 'string') {
      config.src = config.files;
      delete config.files;
      srcFiles = false;
    }

    var files = grunt.task.normalizeMultiTaskFiles(config, target);

    var newerFiles;
    var stamp = getStamp(options.timestamps, name, target);
    var repeat = grunt.file.exists(stamp);
    var modified = false;

    if (repeat) {
      // look for files that have been modified since last run
      var previous = fs.statSync(stamp).mtime;
      newerFiles = files.map(function(obj) {
        var time;
        /**
         * It is possible that there is a dest file that has been created
         * more recently than the last successful run.  This would happen if
         * a target with multiple dest files failed before all dest files were
         * created.  In this case, we don't need to re-run src files that map
         * to dest files that were already created.
         */
        var existsDest = obj.dest && grunt.file.exists(obj.dest);
        if (existsDest) {
          time = Math.max(fs.statSync(obj.dest).mtime, previous);
        } else {
          if (obj.dest) {
            // The dest file may have been removed.  Run with all src files.
            time = 0;
          } else {
            time = previous;
          }
        }
        var src = obj.src.filter(function(filepath) {
          var newer = fs.statSync(filepath).mtime > time;
          if (newer) {
            modified = true;
          }
          return newer;
        });

        if (!existsDest && prefix === 'any-newer') {
          modified = true;
        }
        return {src: src, dest: obj.dest};
      }).filter(function(obj) {
        return obj.src && obj.src.length > 0;
      });
    }

    /**
     * If we started out with only src files in the files config, transform
     * the newerFiles array into an array of source files.
     */
    if (!srcFiles) {
      newerFiles = newerFiles.map(function(obj) {
        return obj.src;
      });
    }

    /**
     * Cases:
     *
     * 1) First run, process all.
     * 2) Repeat run, nothing modified, process none.
     * 3) Repeat run, something modified, any false, process modified.
     * 4) Repeat run, something modified, any true, process all.
     */

    var qualified = name + ':' + target;
    if (repeat && !modified) {
      // case 2
      grunt.log.writeln('No newer files to process.');
    } else {
      if (repeat && modified && !any) {
        // case 3
        config.files = newerFiles;
        delete config.src;
        delete config.dest;
        grunt.config.set([name, target], config);
      }
      // case 1, 3 or 4
      tasks = [
        qualified + (args ? ':' + args : ''),
        'newer-timestamp:' + qualified + ':' + options.timestamps
      ];
      // if we modified the config (case 3), reset it to the original after
      if (repeat && modified && !any) {
        tasks.push('newer-reconfigure:' + qualified + ':' + id);
      }
      grunt.task.run(tasks);
    }
  };
}


/** @param {Object} grunt Grunt. */
module.exports = function(grunt) {

  grunt.registerTask(
      'newer', 'Run a task with only those source files that have been ' +
      'modified since the last successful run.', createTask(grunt));

  grunt.registerTask(
      'any-newer', 'Run a task with all source files if any have been ' +
      'modified since the last successful run.', createTask(grunt, true));

  grunt.registerTask(
      'newer-timestamp', 'Internal task.', function(name, target, dir) {
        // if dir includes a ':', grunt will split it among multiple args
        dir = Array.prototype.slice.call(arguments, 2).join(':');
        grunt.file.write(getStamp(dir, name, target), '');
      });

  grunt.registerTask(
      'newer-reconfigure', 'Internal task.', function(name, target, id) {
        grunt.config.set([name, target], pluckConfig(id));
      });

};
