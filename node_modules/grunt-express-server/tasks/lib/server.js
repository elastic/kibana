/*
 * grunt-express-server
 * https://github.com/ericclemmons/grunt-express-server
 *
 * Copyright (c) 2013 Eric Clemmons
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt, target) {
  if (!process._servers) {
    process._servers = {};
  }

  var backup  = null;
  var done    = null;
  var server  = process._servers[target]; // Store server between live reloads to close/restart express

  var finished = function() {
    if (done) {
      done();

      done = null;
    }
  };

  return {
    start: function start(options) {
      if (server) {
        this.stop();

        if (grunt.task.current.flags.stop) {
          finished();

          return;
        }
      }

      backup = JSON.parse(JSON.stringify(process.env)); // Clone process.env

      // For some weird reason, on Windows the process.env stringify produces a "Path"
      // member instead of a "PATH" member, and grunt chokes when it can't find PATH.
      if (!backup.PATH) {
        if (backup.Path) {
          backup.PATH = backup.Path;
          delete backup.Path;
        }
      }

      grunt.log.writeln('Starting '.cyan + (options.background ? 'background' : 'foreground') + ' Express server');

      done = grunt.task.current.async();

      // Set PORT for new processes
      process.env.PORT = options.port;

      // Set NODE_ENV for new processes
      if (options.node_env) {
        process.env.NODE_ENV = options.node_env;
      }

      if (options.cmd === 'coffee') {
        grunt.log.writeln('You are using cmd: coffee'.red);
        grunt.log.writeln('coffee does not allow a restart of the server'.red);
        grunt.log.writeln('use opts: ["path/to/your/coffee"] instead'.red);
      }

      // Set debug mode for node-inspector
      if (options.debug) {
        options.opts.unshift('--debug');
        if (options.cmd === 'coffee') {
          options.opts.unshift('--nodejs');
        }
      }

      if (options.background) {
        var donefunc = (options.delay || options.output) ?  function() {} : finished;
        server = process._servers[target] = grunt.util.spawn({
          cmd:      options.cmd,
          args:     options.opts.concat(options.args),
          env:      process.env,
          fallback: options.fallback
        }, donefunc);

        if (options.delay) {
          setTimeout(finished, options.delay);
        }

        if (options.output) {
          server.stdout.on('data', function(data) {
            var message = "" + data;
            var regex = new RegExp(options.output, "gi");
            if (message.match(regex)) {
              finished();
            }
          });
        }
        server.stderr.on('data', function(data) {
            if (!options.debug) { 
              finished();
            } else {
              var message = "" + data;
              var regex = new RegExp('debugger listening', "gi");
              if (!message.match(regex)) {
                finished();
              }
            }
          });
        server.stdout.pipe(process.stdout);
        server.stderr.pipe(process.stderr);
      } else {
        // Server is ran in current process
        server = process._servers[target] = require(options.script);
      }

      process.on('exit', finished);
      process.on('exit', this.stop);
    },

    stop: function stop() {
      if (server && server.kill) {
        grunt.log.writeln('Stopping'.red + ' Express server');

        server.kill('SIGTERM');
        process.removeListener('exit', finished);
        process.removeListener('exit', stop);
        server = process._servers[target] = null;
      }

      // Restore original process.env
      if (backup) {
        process.env = JSON.parse(JSON.stringify(backup));
      }

      finished();
    }
  };
};
