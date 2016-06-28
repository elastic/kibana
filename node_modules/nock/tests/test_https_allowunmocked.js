'use strict';

var test          = require('tap').test;
var mikealRequest = require('request');

test('allowUnmock for https', function(t) {
  var nock = require('../');
  nock.enableNetConnect();
  var scope = nock('https://www.google.com/', {allowUnmocked: true})
  .get('/pathneverhit')
  .reply(200, {foo: 'bar'});

  var options = {
    method: 'GET',
    uri: 'https://www.google.com'
  };

  mikealRequest(options, function(err, resp, body) {
    t.notOk(err, 'should be no error');
    t.true(typeof body !== 'undefined', 'body should not be undefined');
    t.true(body.length !== 0, 'body should not be empty');
    t.end();
    return console.log(resp.statusCode, 'body length: ', body.length);
  });
});
