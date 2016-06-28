var nock = require('../');
var test = require('tap').test;
var mikealRequest = require('request');
var assert = require('assert');

test('disable net connect is default', function (t) {
  nock.disableNetConnect();
  nock('http://somethingelsecompletelyunrelated.com').get('/').reply(200);

  mikealRequest('https://google.com/', function(err, res) {
    assert(err);
    assert.equal(err.message, 'Nock: Not allow net connect for "google.com:443/"');
    t.end();
  })
});
