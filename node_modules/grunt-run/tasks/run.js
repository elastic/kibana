/*
 * grunt-run
 * https://github.com/spenceralger/grunt-run
 *
 * Copyright (c) 2013 Spencer Alger
 * Licensed under the MIT license.
 */
module.exports = makeTask;
function makeTask(grunt) {
  var _ = require('lodash');
  var util = require('util');
  var stripAnsi = require('strip-ansi');
  var child_process = require('child_process');

  var shouldEscapeRE = / |"|'|\$|&|\\/;
  var dangerArgsRE = /"|\$|\\/g;
  var runningProcs = [];

  process.on('exit', function () {
    _.invoke(runningProcs, 'kill');
  });

  function getPid(name) {
    return grunt.config.get('stop.' + grunt.config.escape(name) + '._pid');
  }

  function savePid(name, pid) {
    grunt.config.set('stop.' + grunt.config.escape(name) + '._pid', pid);
    grunt.config.set('wait.' + grunt.config.escape(name) + '._pid', pid);
  }

  function clearPid(name) {
    grunt.config.set('stop.' + grunt.config.escape(name) + '._pid', null);
    grunt.config.set('wait.' + grunt.config.escape(name) + '._pid', null);
  }

  grunt.task.registerMultiTask('run', 'used to start external processes (like servers)', function (keepalive) {
    var self = this;
    var name = this.target;
    var cmd = this.data.cmd || 'node';
    var args = this.data.args || [];
    var additionalArgs = [];
    var opts = this.options({
      wait: true,
      failOnError: false,
      quite: false,
      ready: 1000,
      cwd: process.cwd(),
      passArgs: [],
      itterable: false,
      readyBufferLength: 1024
    });

    if (keepalive === 'keepalive') {
      // override the wait setting
      opts.wait = true;
    }

    var spawnOpts = {
      cwd: opts.cwd,
      stdio: ['ignore', 'pipe', 'pipe']
    };

    if (opts.env) {
      spawnOpts.env = opts.env;
    }

    var pid = getPid(name);
    if (pid && _.find(runningProcs, { pid: pid })) {
      grunt.log.warn(name + ' is already running');
      return;
    }

    if (!opts.itterable && _.contains(process.argv, 'run')) {
      grunt.log.warn('Skipping run:' + this.target + ' since it not itterable. Call it directly or from another task.');
      return;
    }

    opts.passArgs.map(function (arg) {
      var val = grunt.option(arg);

      if (val !== void 0) {
        if (shouldEscapeRE.test(arg)) {
          val = '"' + arg.replace(dangerArgsRE, function (match) {
            return '\\' + match;
          }) + '"';
        }

        additionalArgs.push('--' + arg + '=' + val);
      }
    });

    if (this.data.exec) {
      // logic is from node's cp.exec method, adapted to benefit from
      // streaming io
      if (process.platform === 'win32') {
        cmd = 'cmd.exe';
        args = ['/s', '/c', '"' + this.data.exec + '"'];
        spawnOpts.windowsVerbatimArguments = true;
      } else {
        cmd = '/bin/sh';
        args = ['-c', this.data.exec];
      }

      if (additionalArgs.length) {
        args[1]+= ' ' + additionalArgs.join(' ');
      }
    } else {
      args = args.concat(additionalArgs);
    }

    grunt.verbose.writeln('running', cmd, 'with args', args);
    var proc = child_process.spawn(cmd, args, spawnOpts);
    savePid(name, proc.pid);

    var done = this.async();
    var timeoutId = null;

    // handle stdout, stderr
    if (!opts.quiet) {
      proc.stdout.pipe(process.stdout);
      proc.stderr.pipe(process.stderr);

      proc.on('close', function () {
        proc.stdout.unpipe(process.stdout);
        proc.stderr.unpipe(process.stderr);
      });
    }

    // handle errors that prevent the proc from starting
    proc.on('error', function (err) {
      grunt.log.error(err);
    });

    if (opts.wait) {
      waitForProc();
    } else {
      trackBackgroundProc();

      if (opts.ready instanceof RegExp) {
        waitForReadyOutput();
      } else if (opts.ready) {
        waitForTimeout();
      } else {
        doNotWait();
      }
    }


    // ensure that the streams are draining if we aren't already draining them (like quiet=true)
    proc.stdout.resume();
    proc.stdout.resume();
    return;

    // we are waiting for the proc to close before moving on
    function waitForProc() {
      proc.on('close', function (exitCode) {
        done(exitCode && new Error('non-zero exit code ' + exitCode));
      });
    }

    // we aren't waiting for this proc to close, so setup some tracking stuff
    function trackBackgroundProc() {
      runningProcs.push(proc);
      proc.on('close', function () {
        _.pull(runningProcs, proc);
        clearPid(name);
        grunt.log.debug('Process ' + name + ' closed.');
      });
    }

    // we are scanning the output for a specific regular expression
    function waitForReadyOutput() {
      function onCloseBeforeReady(exitCode) {
        done(exitCode && new Error('non-zero exit code ' + exitCode));
      }

      var outputBuffer = '';

      function checkChunkForReady(chunk) {
        outputBuffer += chunk.toString('utf8');

        // ensure the buffer doesn't grow out of control
        if (outputBuffer.length >= opts.readyBufferLength) {
          outputBuffer = outputBuffer.slice(outputBuffer.length - opts.readyBufferLength);
        }

        // don't strip ansi until we check, incase an ansi marker is split across chuncks.
        if (!opts.ready.test(stripAnsi(outputBuffer))) return;

        outputBuffer = '';
        proc.removeListener('close', onCloseBeforeReady);
        proc.stdout.removeListener('data', checkChunkForReady);
        proc.stderr.removeListener('data', checkChunkForReady);
        done();
      }

      proc.on('close', onCloseBeforeReady);
      proc.stdout.on('data', checkChunkForReady);
      proc.stderr.on('data', checkChunkForReady);
    }

    function waitForTimeout() {
      timeoutId = setTimeout(function () {
        grunt.log.ok(name + ' started');
        done();
      }, opts.ready);
    }

    function doNotWait() {
      grunt.log.ok(name + ' started');
      done();
    }

  });

  grunt.task.registerMultiTask('stop', 'stop a process started with "run" ' +
    '(only works for tasks that use wait:false)', function () {

    var pid = this.data._pid;
    var name = this.target;
    var procs = _.where(runningProcs, { pid: pid });
    clearPid(name);
    if (procs.length) {
      _.invoke(procs, 'kill');
      grunt.log.ok(name + ' stopped');
    } else {
      grunt.log.ok(name + ' already stopped');
    }
  });

  grunt.task.registerMultiTask('wait', 'wait for a process started with "run" to close ' +
    '(only works for tasks that use wait:false)', function () {

    var pid = this.data._pid;
    var proc = _.find(runningProcs, { pid: pid });
    if (proc) {
      proc.once('close', this.async());
    } else {
      grunt.log.writeln(this.target + ' (' + pid + ') is already stopped.');
    }
  });

}
