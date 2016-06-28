
var grunt = require('grunt')
  , fs = require('fs')

var hashFile = require('../tasks/lib/common').hashFile
  , s3 = require('../tasks/lib/s3').init(grunt)
  , _ = grunt.util._
  , async = grunt.util.async
  , s3Config = grunt.config("s3")
  , common = require('./common')
  , config = common.config;

module.exports = {
  setUp: function(cb) {
    async.series([
      common.clean,
      function(done) {
        s3.upload(__dirname + '/files/a.txt', 'a.txt', common.config).done(done);
      }
    ], function() {
      cb();
    });
  },

  testDelete: function(test) {
    test.expect(4);

    var dest = 'a.txt';
    var client = s3.makeClient(config);

    async.series([
      function(next) {
        client.getFile(dest, function (err, res) {
          test.ifError(err);
          test.equal(res.statusCode, 200, 'File exists.');
          next();
        });
      },
      function(next) {
        s3.del(dest, config).done(function() {
          next();
        });
      },
      function(next) {
        client.getFile(dest, function (err, res) {
          test.ifError(err);
          test.equal(res.statusCode, 404, 'File does not exist.');
          next();
        }, 500);
      }
    ], function(err) {
      test.done();
    });
  }
};