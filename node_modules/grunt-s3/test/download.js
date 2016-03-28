
var grunt = require('grunt');
var hashFile = require('../tasks/lib/common').hashFile;
var s3 = require('../tasks/lib/s3').init(grunt);

var _ = grunt.util._;
var async = grunt.util.async;

var s3Config = grunt.config("s3")
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

  testDownload : function (test) {
    test.expect(1);

    var dest = __dirname + '/files/a.txt';
    var src = __dirname + '/../s3/127/test/a.txt/.fakes3_metadataFFF/content';

    s3.download('a.txt', dest, config)
      .done(function () {
        test.ok(hashFile(src) === hashFile(dest), 'File downloaded successfully.');
      })
      .always(function () {
        test.done();
      })
  },

  testDownloadDebug : function (test) {
    test.expect(1);

    var dest = __dirname + '/files/b.txt.debug';
    var src = __dirname + '/../s3/127/test/b.txt/.fakes3_metadataFFF/content';

    var debugConfig = _.defaults({}, config, {debug: true});

    s3.download('b.txt', dest, debugConfig)
      .done(function () {
        test.throws(function () {
          grunt.file.read(dest);
        });
      })
      .always(function () {
        test.done();
      })
  }
};
