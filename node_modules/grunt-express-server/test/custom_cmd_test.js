/*
 * grunt-express-server
 * https://github.com/ericclemmons/grunt-express-server
 *
 * Copyright (c) 2013 Eric Clemmons
 * Licensed under the MIT license.
 */

'use strict';

var get = require('./lib/get');

module.exports.custom_output = {
  test_runs_from_coffeescript_server: function(test) {
    test.expect(2);

    get('http://localhost:3000/', function(res, body) {
      test.equal(res.statusCode, 200, 'should return 200');
      test.equal(body, 'Howdy from CoffeeScript!', 'should return message from CoffeeScript server');
      test.done();
    }, function(err) {
      test.done();
    });
  }
};
