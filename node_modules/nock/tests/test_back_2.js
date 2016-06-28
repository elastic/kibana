var test     = require('tap').test;
var nock = require('../');
var nockBack = nock.back;
var http = require("http");
var rimraf = require('rimraf');
var fs = require('fs');

var originalMode;
var fixture;

test('setup', function(t) {
  originalMode = nockBack.currentMode;

  nock.enableNetConnect();
  nockBack.fixtures = __dirname + "/fixtures";
  fixture = nockBack.fixtures + '/recording_test.json'
  rimraf.sync(fixture);

  nockBack.setMode("record");
  t.end();
});


test('recording', function(t) {
  nockBack('recording_test.json', function(nockDone) {
    http.get('http://google.com', function(res) {
      res.once('end', function() {
        nockDone();
        var fixtureContent = JSON.parse(fs.readFileSync(fixture, {encoding: 'utf8'}));
        t.equal(fixtureContent.length, 1);
        fixtureContent = fixtureContent[0];
        t.equal(fixtureContent.method, 'GET');
        t.equal(fixtureContent.path, '/');
        t.ok(fixtureContent.status == 302 || fixtureContent.status == 301);
        t.end();
      });
      // Streams start in 'paused' mode and must be started.
      // See https://nodejs.org/api/stream.html#stream_class_stream_readable
      res.resume();
    });
  });
}).once('end', function() {
  rimraf.sync(fixture);
  nockBack.setMode(originalMode);
});
