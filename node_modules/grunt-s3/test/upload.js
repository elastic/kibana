
var grunt = require('grunt');
var yaml = require('libyaml');
var hashFile = require('../tasks/lib/common').hashFile;
var s3 = require('../tasks/lib/s3').init(grunt);

var _ = grunt.util._;
var async = grunt.util.async;

var s3Config = grunt.config("s3")
  , common = require('./common')
  , config = common.config;

module.exports = {
  setUp: common.clean,

  testUpload : function (test) {
    test.expect(2);

    async.series([
      function (cb) {
        var src = __dirname + '/files/a.txt';
        var dest = __dirname + '/../s3/127/test/a.txt/.fakes3_metadataFFF/content';

        s3.upload(src, 'a.txt', config)
          .done(function () {
            test.ok(hashFile(src) === hashFile(dest), 'File uploaded successfully.');
          })
          .always(function () {
            cb(null);
          });
      },
      function (cb) {
        s3.upload('./src does not exist', './dest does not matter')
          .fail(function (err) {
            test.ok(err, 'Missing source results in an error.');
          })
          .always(function () {
            cb(null);
          });
      }
    ], test.done);
  },

  testUploadWithHeaders : function (test) {
    test.expect(1);

    async.series([
      function (cb) {
        var src = __dirname + '/files/b.txt';
        var dest = __dirname + '/../s3/127/test/b.txt/.fakes3_metadataFFF/metadata';

        var headerConfig = _.defaults({}, config, { headers : {'Content-Type' : '<3'} });

        s3.upload(src, 'b.txt', headerConfig)
          .always(function () {
            var meta = yaml.parse(grunt.file.read(dest));
            test.ok(meta[0][':content_type'] === new Buffer('<3').toString('base64'), 'Headers are preserved.');
            cb(null);
          });
      }
    ], test.done);
  },

  testUploadDebug : function (test) {
    test.expect(1);

    var src = __dirname + '/files/c.txt';
    var dest = __dirname + '/../s3/127/test/c.txt/.fakes3_metadataFFF/content';

    var debugConfig = _.defaults({}, config, { debug: true });

    s3.upload(src, "c.txt", debugConfig)
      .always(function () {
        test.throws(function () {
          grunt.file.read(dest);
        });

        test.done();
      })
  }
};
