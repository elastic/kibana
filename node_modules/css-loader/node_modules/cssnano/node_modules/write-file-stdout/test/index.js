
var assert = require('assert');
var fs = require('fs');
var write = require('..');

describe('write-file-stdout', function () {
  afterEach(function () {
    if (fs.existsSync('fixture.txt')) fs.unlinkSync('fixture.txt');
  });

  it('should write to a file', function () {
    write('fixture.txt', 'test');
    assert.equal('test', fs.readFileSync('fixture.txt'));
  });

  it('should write to stdout', function (done) {
    process.stdout.write = function (data) {
      assert.equal('test', data);
      done();
    };
    write('test');
  });
});