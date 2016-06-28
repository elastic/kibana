
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

  testSync: function (test) {
    test.expect(1);

    var src = __dirname + '/files/a.txt';
    var dest = __dirname + '/../s3/127/test/a.txt/.fakes3_metadataFFF/content';

    s3.sync(src, 'a.txt', config)
      .done(function () {
        test.ok(hashFile(src) === hashFile(dest), 'File uploaded successfully.');
      })
      .always(function () {
        test.done();
      });
  },

  testSyncInvalidSrc: function(test) {
    test.expect(1);

    s3.sync('./src does not exist', './dest does not matter', config)
      .fail(function (err) {
        test.ok(err, 'Missing source results in an error.');
      })
      .always(function () {
        test.done();
      });
  }
};
