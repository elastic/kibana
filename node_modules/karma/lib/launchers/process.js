var path = require('path');
var log = require('../logger').create('launcher');
var env = process.env;

var ProcessLauncher = function(spawn, tempDir, timer) {

  var self = this;
  var onExitCallback;
  var killTimeout = 2000;

  this._tempDir = tempDir.getPath('/karma-' + this.id.toString());

  this.on('start', function(url) {
    tempDir.create(self._tempDir);
    self._start(url);
  });

  this.on('kill', function(done) {
    if (!self._process) {
      return process.nextTick(done);
    }

    onExitCallback = done;
    self._process.kill();
    self._killTimer = timer.setTimeout(self._onKillTimeout, killTimeout);
  });

  this._start = function(url) {
    self._execCommand(self._getCommand(), self._getOptions(url));
  };

  this._getCommand = function() {
    return env[self.ENV_CMD] || self.DEFAULT_CMD[process.platform];
  };

  this._getOptions = function(url) {
    return [url];
  };

  // Normalize the command, remove quotes (spawn does not like them).
  this._normalizeCommand = function(cmd) {
    if (cmd.charAt(0) === cmd.charAt(cmd.length - 1) && '\'`"'.indexOf(cmd.charAt(0)) !== -1) {
      cmd = cmd.substring(1, cmd.length - 1);
      log.warn('The path should not be quoted.\n  Normalized the path to %s', cmd);
    }

    return path.normalize(cmd);
  };

  this._execCommand = function(cmd, args) {
    if (!cmd) {
      log.error('No binary for %s browser on your platform.\n  ' +
                'Please, set "%s" env variable.', self.name, self.ENV_CMD);

      self._retryLimit = -1; // disable restarting

      return self._clearTempDirAndReportDone('no binary');
    }

    cmd = this._normalizeCommand(cmd);

    log.debug(cmd + ' ' + args.join(' '));
    self._process = spawn(cmd, args);

    var errorOutput = '';

    self._process.on('close', function(code) {
      self._onProcessExit(code, errorOutput);
    });

    self._process.on('error', function(err) {
      if (err.code === 'ENOENT') {
        self._retryLimit = -1;
        errorOutput = 'Can not find the binary ' + cmd + '\n\t' +
                      'Please set env variable ' + self.ENV_CMD;
      } else {
        errorOutput += err.toString();
      }
    });

    // Node 0.8 does not emit the error
    if (process.versions.node.indexOf('0.8') === 0) {
      self._process.stderr.on('data', function(data) {
        var msg = data.toString();

        if (msg.indexOf('No such file or directory') !== -1) {
          self._retryLimit = -1;
          errorOutput = 'Can not find the binary ' + cmd + '\n\t' +
                        'Please set env variable ' + self.ENV_CMD;
        } else {
          errorOutput += msg;
        }
      });
    }
  };

  this._onProcessExit = function(code, errorOutput) {
    log.debug('Process %s exited with code %d', self.name, code);

    var error = null;

    if (self.state === self.STATE_BEING_CAPTURED) {
      log.error('Cannot start %s\n\t%s', self.name, errorOutput);
      error = 'cannot start';
    }

    if (self.state === self.STATE_CAPTURED) {
      log.error('%s crashed.\n\t%s', self.name, errorOutput);
      error = 'crashed';
    }

    self._process = null;
    if (self._killTimer) {
      timer.clearTimeout(self._killTimer);
      self._killTimer = null;
    }
    self._clearTempDirAndReportDone(error);
  };

  this._clearTempDirAndReportDone = function(error) {
    tempDir.remove(self._tempDir, function() {
      self._done(error);
      if (onExitCallback) {
        onExitCallback();
        onExitCallback = null;
      }
    });
  };

  this._onKillTimeout = function() {
    if (self.state !== self.STATE_BEING_KILLED) {
      return;
    }

    log.warn('%s was not killed in %d ms, sending SIGKILL.', self.name, killTimeout);
    self._process.kill('SIGKILL');
  };
};

ProcessLauncher.decoratorFactory = function(timer) {
  return function(launcher) {
    ProcessLauncher.call(launcher, require('child_process').spawn, require('../temp_dir'), timer);
  };
};


module.exports = ProcessLauncher;
