var path = require('path');
var grunt = require('grunt');
var s3 = require('../tasks/lib/s3').init(grunt);
var S3Task = require('../tasks/lib/S3Task');
var deferred = require('underscore.deferred');

var async = grunt.util.async;
var _ = grunt.util._;
_.mixin(deferred);

var s3Config = grunt.config("s3")
  , common = require('./common')
  , config = common.config;

var makeMockTask = function (taskDef) {
  // A fake grunt task
  // TODO: Figure out if grunt has a way to mock this.
  var mockTask = {
    _asyncCalls: 0,
    async: function () {
      this._asyncCalls++;
      return function (result) {
          taskDef.resolve(result);
      };
    },
    options: function (defaults) {
      return _.defaults({}, config, defaults);
    },
    data: s3Config.test_S3Task
  };

  // Remove the options from the data.
  mockTask.data.options = null;

  return mockTask;
};

module.exports = {
  setUp: common.clean,
  run: function (test) {
    var taskDef = new _.Deferred();
    var asyncCalls = 0;
    var mockTask = makeMockTask(taskDef);
    var task = new S3Task(mockTask, s3);

    var uploadOrig = s3.upload;
    var uploadFiles = [];
    var uploadCalls = 0;

    // Fake the upload functionality; it's tested elsewhere.
    s3.upload = function (file, dest, opts) {
      uploadCalls++;

      var def = new _.Deferred();

      uploadFiles.push(dest);

      setTimeout(function () {
        def.resolve();
      }, 10);

      return def.promise();
    };

    // Wait for the run() call to complete then test activity.
    taskDef.then(function(result) {
        test.equal(mockTask._asyncCalls, 1, '1 async() call');
        test.equal(uploadFiles.length, 5, '5 uploaded files');
        test.equal(uploadFiles[0], 'a.txt', 'Correct rel path on uploaded file 1');
        test.equal(uploadFiles[4], 'subdir/d.txt', 'Correct rel path for subdir file');
        test.ok(result, 'Completed');
      }, function (err) {
        test.ok(false, "Error'd");
      })
      .always(function () {
        s3.upload = uploadOrig;
        test.done();
      });

    task.run();
  },

  _parseUploadFiles: function (test) {
    var mockTask = makeMockTask();
    var task = new S3Task(mockTask, s3);
    var config = task.getConfig();

    test.equal(config.upload.length, 1, 'Has upload to parse');

    var uploadFiles = task._parseUploadFiles(config.upload[0], config);

    test.equal(uploadFiles.length, 5, 'Has 5 files to be uploaded');

    // Overrides are correct.
    test.equal(uploadFiles[0].upload.bucket, 'overridden');

    // File paths in root
    test.equal(uploadFiles[0].file, path.join(process.cwd(), 'test', 'files', 'a.txt'));
    test.equal(uploadFiles[1].file, path.join(process.cwd(), 'test', 'files', 'b.txt'));

    // File paths in subdir
    test.equal(uploadFiles[3].file, path.join(process.cwd(), 'test', 'files', 'subdir', 'c.txt'));
    test.equal(uploadFiles[4].file, path.join(process.cwd(), 'test', 'files', 'subdir', 'd.txt'));

    // Destinations don't have full path, but have subdir
    test.equal(uploadFiles[0].dest, 'a.txt');
    test.equal(uploadFiles[1].dest, 'b.txt');
    test.equal(uploadFiles[3].dest, path.join('subdir', 'c.txt'));
    test.equal(uploadFiles[4].dest, path.join('subdir', 'd.txt'));

    test.done();
  },

  getConfig: function (test) {
    // A fake grunt task
    // TODO: Figure out if grunt has a way to mock this.
    var mockTask = makeMockTask();

    var oldVal = {
      key: process.env.AWS_ACCESS_KEY_ID,
      secret: process.env.AWS_SECRET_ACCESS_KEY
    };

    // Making sure we choose the options over the process key
    process.env.AWS_ACCESS_KEY_ID = 'testid';
    process.env.AWS_SECRET_ACCESS_KEY = 'secret';

    var task = new S3Task(mockTask, s3);
    var config = task.getConfig();

    // Test the custom things first
    test.equal(config.key, s3Config.options.key, 'Key');
    test.equal(config.secret, s3Config.options.secret, 'Secret');
    test.equal(config.debug, false, 'Debug');

    // Test the data actions
    test.equal(config.upload.length, 1, 'Upload length');

    // Testing things that are only in the default options.
    test.equal(config.bucket, s3Config.options.bucket, 'Bucket');
    test.equal(config.endpoint, s3Config.options.endpoint, 'Endpoint');

    // Newly added options
    test.equal(config.maxOperations, 0, 'Defaults max operations to 0');
    test.equal(config.encodePaths, false, 'Defaults encodePaths to false');

    // Be a good citizen and reset these.
    process.env.AWS_ACCESS_KEY_ID = oldVal.key;
    process.env.AWS_SECRET_ACCESS_KEY = oldVal.secret;

    test.done();
  }
};
