var fs = require('fs');
var ngmin = require('ngmin');

describe('grunt-ngmin', function(){
  it('should annotate all the things', function(){
    var expected = ngmin.annotate(fs.readFileSync('test/src/controllers/one.js'));
    var actual = fs.readFileSync('test/generated/controllers/one.js').toString();
    expected.should.equal(actual);
  });

  it('should annotate all the dynamic things', function(){
    var expected = ngmin.annotate(fs.readFileSync('test/src/directives/one.js'));
    var actual = fs.readFileSync('test/generated/directives/one.js').toString();
    expected.should.equal(actual);
  });
});