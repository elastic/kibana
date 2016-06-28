'use strict';

var test = require('tap').test;
var mikealRequest = require('request');
var nock = require('../');

test("basic auth", function(t) {
  nock('http://super-secure.com')
    .get('/test')
    .basicAuth({
      user: 'foo',
      pass: 'bar'
    })
    .reply(200, 'Here is the content');

  t.test('work when it match', function (t) {
    mikealRequest({
      url: 'http://super-secure.com/test',
      auth: {
        user: 'foo',
        pass: 'bar'
      }
    }, function(err, res, body) {
      if (err) {
        throw err;
      }
      t.equal(res.statusCode, 200);
      t.equal(body, 'Here is the content');
      t.end();
    });
  });

  t.test('fail when it doesnt match', function (t) {
    mikealRequest({
      url: 'http://super-secure.com/test',
    }, function(err, res, body) {
      t.type(err, 'Error')
      t.end();
    });
  });

});