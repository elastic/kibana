var should = require('should');
var postcss = require('postcss');
var fs = require('fs');
var pseudoelements = require('../index.js')

describe('test', function() {

  it('should complete pseudo selectors', function() {
    var input = fs.readFileSync('./test/input.css', 'utf-8');
    var expected = fs.readFileSync('./test/expected.css', 'utf-8');

    var out = postcss(pseudoelements()).process(input);

    out.css.should.equal(expected, 'test failed')
  });

});
