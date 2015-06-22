/*
 * grunt-express-server
 * https://github.com/ericclemmons/grunt-express-server
 *
 * Copyright (c) 2013 Eric Clemmons
 * Licensed under the MIT license.
 */

'use strict';

var get = require('./lib/get');

module.exports.custom_port = {
  test_accessible_on_8080: function(test) {
    test.expect(2);

    get('http://localhost:8080/hello.txt', function(res, body) {
      test.equal(res.statusCode, 200, 'should return 200');
      test.equal(body, 'Howdy!\n', 'should return static page');
      test.done();
    }, function(err) {
      test.done();
    });
  },

  test_runs_in_development: function(test) {
    test.expect(2);

    get('http://localhost:8080/env', function(res, body) {
      test.equal(res.statusCode, 200, 'should return 200');
      test.equal(body, 'Howdy from development!', 'should return dynamic page');
      test.done();
    }, function(err) {
      test.done();
    });
  }
};
