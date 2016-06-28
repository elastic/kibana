var path = require('path');

var grunt = require('grunt');
var _ = grunt.util._;
var async = grunt.util.async;

var S3Task = function (origTask, s3) {
  this._origTask = origTask;
  this.s3 = s3;
};

S3Task.prototype = {
  run: function () {
    var self = this;
    var s3 = this.s3;
    var done = this._origTask.async();
    var config = this.getConfig();
    var transfers = [];

    if (config.debug) {
      grunt.log.writeln('Running in debug mode, no transfers will be made'.yellow);
      grunt.log.writeln();
    }

    config.upload.forEach(function (upload) {
      var uploadFiles = self._parseUploadFiles(upload, config);

      uploadFiles.forEach(function (uploadFile) {
        transfers.push(s3.upload.bind(s3, uploadFile.file, uploadFile.dest, uploadFile.upload));
      });
    });

    config.sync.forEach(function (sync) {
      var syncFiles = self._parseUploadFiles(sync, config);

      syncFiles.forEach(function (syncFile) {
        transfers.push(s3.sync.bind(s3, syncFile.file, syncFile.dest, syncFile.upload));
      });
    });

    config.download.forEach(function (download) {
      transfers.push(s3.download.bind(s3, download.src, download.dest, _(download).defaults(config)));
    });

    config.del.forEach(function (del) {
      transfers.push(s3.del.bind(s3, del.src, _(del).defaults(config)));
    });

    config.copy.forEach(function (copy) {
      transfers.push(s3.copy.bind(s3, copy.src, copy.dest, _(copy).defaults(config)));
    });

    var total = transfers.length;
    var errors = 0;

    var eachTransfer = config.maxOperations > 0 ?
      async.forEachLimit.bind(async,transfers,config.maxOperations) :
      async.forEach.bind(async,transfers);

    eachTransfer(function (transferFn, completed){
      var transfer = transferFn();

      transfer.done(function (msg) {
        grunt.log.ok(msg);
        completed();
      });

      transfer.fail(function (msg) {
        grunt.log.error(msg);
        ++errors;
        completed();
      });

    }, function () {
      done(!errors);
    });
  },

  _parseUploadFiles: function (upload, config) {
    // Expand list of files to upload.
    var files = grunt.file.expand({ filter: 'isFile' }, upload.src);
    var destPath = grunt.template.process(upload.dest || '');

    return _.map(files, function (file) {
      file = path.resolve(file);
      upload.src = path.resolve(grunt.template.process(upload.src));

      // Put the key, secret and bucket information into the upload for knox.
      var fileConfig = _.extend({}, config, upload.options || {});

      // If there is only 1 file and it matches the original file wildcard,
      // we know this is a single file transfer. Otherwise, we need to build
      // the destination.
      var dest;
      if (files.length === 1 && file === upload.src) {
        dest = destPath;
      }
      else {
        if (upload.rel) {
          dest = path.join(destPath, path.relative(grunt.file.expand({ filter: "isDirectory" }, upload.rel)[0], file));
        }
        else {
          dest = path.join(destPath, path.basename(file));
        }
      }

      if (config.encodePaths === true) {
        dest = encodeURIComponent(dest);
      }

      dest = dest.replace(/\\/g, '/');

      return {
        file: file,
        dest: dest,
        upload: fileConfig
      };
    });
  },

  /**
   * Return the config, allow for arbitrary options that don't originate
   * from grunt.
   *
   * @param  {Object=} optOptions optionally define an options object.
   * @param  {Object=} optData optionally define file actions,
   *   will ignore defaults.
   * @return {Object} A normalized configuration.
   */
  getConfig: function (optOptions, optData) {
    // Grab the options for this task.
    var opts = optOptions || this._origTask.options();

    var defaultOpts = {
      key: process.env.AWS_ACCESS_KEY_ID,
      secret: process.env.AWS_SECRET_ACCESS_KEY,
      debug: false,
      verify: false,
      maxOperations: 0,
      encodePaths: false
    };

    // Grab the actions to perform from the task data, default to empty arrays
    var fileActions = optData || this._origTask.data;
    var defaultFileActions = {
      upload: [],
      download: [],
      del: [],
      copy: [],
      sync: []
    };

    // Combine the options and fileActions as the config
    return _.extend({}, defaultOpts, defaultFileActions, opts, fileActions);
  }
};

module.exports = S3Task;
