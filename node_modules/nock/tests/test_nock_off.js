'use strict';

var test          = require('tap').test;
var mikealRequest = require('request');

test('NOCK_OFF=true works for https', function(t) {
  var original = process.env.NOCK_OFF;
  process.env.NOCK_OFF = 'true';
  var nock = require('../');
  var scope = nock('https://www.google.com')
  .get('/')
  .reply(200, {foo: 'bar'});

  var options = {
    method: 'GET',
    uri: 'https://www.google.com'
  };

  mikealRequest(options, function(err, resp, body) {
    t.notOk(err);
    t.notDeepEqual(body, '{"foo":"bar"}');
    scope.done();
    process.env.NOCK_OFF = original;
    t.end();
  });
});


