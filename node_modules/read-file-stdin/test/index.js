
var assert = require('assert');
var fs = require('fs');
var read = require('..');
var Stream = require('stream').Readable;

describe('read-file-stdin', function () {
  it('should read from a file', function (done) {
    read(__dirname + '/fixtures/simple.txt', function (err, buffer) {
      if (err) return done(err);
      assert.equal('test', buffer.toString());
      done();
    });
  });

  it('should read from stdin', function (done) {
    process.stdin = new Stream();

    read(function (err, buffer) {
      if (err) return done(err);
      assert.equal('test', buffer.toString());
      done();
    });

    process.stdin.emit('data', new Buffer('test'));
    process.stdin.emit('end');
  });

  it('should not return an array', function (done) {
    read(__dirname + '/fixtures/simple.txt', function (err, buffer) {
      if (err) return done(err);
      assert(!Array.isArray(buffer));
      done();
    });
  });

  it('should work with larger files', function (done) {
    read(__dirname + '/fixtures/big.txt', function (err, buffer) {
      if (err) return done(err);
      var expected = fs.readFileSync(__dirname + '/fixtures/big.txt', 'utf8');
      assert.equal(expected, buffer.toString());
      done();
    });
  });
});
