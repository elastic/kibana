/*
 * grunt-express-server
 * https://github.com/ericclemmons/grunt-express-server
 *
 * Copyright (c) 2013 Eric Clemmons
 * Licensed under the MIT license.
 */

'use strict';

var get = require('./lib/get');

module.exports.stoppable = {
  hello: function(test) {
    test.expect(1);

    get('http://localhost:3000/hello.txt', function(res, body) {
      test.done();
    }, function(err) {
      test.equal('ECONNREFUSED', err.code, 'should return ECONNREFUSED');
      test.done();
    });
  }
};
