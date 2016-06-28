'use strict';

var test = require('tap').test;
var nock = require('../.');
var request = require('request');

nock.disableNetConnect();

test('one function returning the body defines a full mock', function(t) {
  var scope = nock('http://acompleteandfullmock.io')
    .get('/abc')
    .reply(function() {
      return 'ABC';
    });

  request.get('http://acompleteandfullmock.io/abc', function(err, resp, body) {
    if (err) {
      throw err;
    }
    t.equal(resp.statusCode, 200);
    t.equal(body, 'ABC');
    t.end();
  });
});

test('one function returning the status code and body defines a full mock', function(t) {
  var scope = nock('http://acompleteandfullmock.io')
    .get('/def')
    .reply(function() {
      return [201, 'DEF'];
    });

  request.get('http://acompleteandfullmock.io/def', function(err, resp, body) {
    if (err) {
      throw err;
    }
    t.equal(resp.statusCode, 201);
    t.equal(body, 'DEF');
    t.end();
  });
});

test('one asynchronous function returning the status code and body defines a full mock', function(t) {
  var scope = nock('http://acompleteandfullmock.io')
    .get('/ghi')
    .reply(function(path, reqBody, cb) {
      setTimeout(function() {
        cb(null, [201, 'GHI']);
      }, 1e3);

    });

  request.get('http://acompleteandfullmock.io/ghi', function(err, resp, body) {
    if (err) {
      throw err;
    }
    t.equal(resp.statusCode, 201);
    t.equal(body, 'GHI');
    t.end();
  });
});

test('asynchronous function gets request headers', function(t) {
  var scope = nock('http://someheadersarein.io')
    .get('/yo')
    .reply(200, function(path, reqBody, cb) {
      t.equal(this.req.path, '/yo');
      t.deepEqual(this.req.headers, {
        'x-my-header': 'some-value',
        'x-my-other-header': 'some-other-value',
        'host': 'someheadersarein.io'
      });
      setTimeout(function() {
        cb(null, [201, 'GHI']);
      }, 1e3);

    });

  request({
    method: 'GET',
    uri: 'http://someheadersarein.io/yo',
    headers: {
      'x-my-header': 'some-value',
      'x-my-other-header': 'some-other-value'
    }}, function(err, resp, body) {
    if (err) {
      throw err;
    }
    t.equal(resp.statusCode, 201);
    t.equal(body, 'GHI');
    t.end();
  });

});