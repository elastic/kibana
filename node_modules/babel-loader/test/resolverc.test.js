'use strict';

var path = require('path');
var expect = require('expect.js');
var resolveRc = require('../lib/resolve-rc.js');

describe('ResolveRc', function() {

  it('should find the .babelrc file', function() {
    var start = path.resolve(__dirname, 'fixtures/babelrc-test/1/2/3');
    var result = resolveRc(start);

    expect(result).to.be.a('string');
  });
});
