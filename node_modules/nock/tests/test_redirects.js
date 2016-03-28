'use strict';

var assert = require('assert');
var test    = require('tap').test;
var mikealRequest = require('request');
var nock    = require('../');

test("follows redirects", function(t) {

  nock('http://redirecter.com')
    .get('/YourAccount')
    .reply(302, undefined, {
        'Location': 'http://redirecter.com/Login'
    })
    .get('/Login')
    .reply(200, 'Here is the login page');

  mikealRequest('http://redirecter.com/YourAccount', function(err, res, body) {
    if (err) {
      throw err;
    }

    assert.equal(res.statusCode, 200);
    assert.equal(body, 'Here is the login page');
    t.end();
  });

});