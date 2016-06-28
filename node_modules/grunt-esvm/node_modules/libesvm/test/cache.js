var fs = require('fs');
var path = require('path');
var temp = require('temp').track();
var expect = require('chai').expect;
var cache = require('../lib/cache');

describe('Cache', function() {
  describe('Base functionality', function () {
    var fixture = {
      example: 'test',
      bar: 'foo',
      foo: 'bar',
    };

    // Create the cache fixture
    before(function (done) {
      temp.open('es-load-cache', function (err, filename) {
        if (err) return done(err);

        cache.source = filename.path;
        fs.writeFile(cache.source, JSON.stringify(fixture), done);
      });
    });

    // Clean up the cache file
    after(function (done) {
      temp.cleanup(done);
    });

    it('should return valid data', function(done) {
      cache.get('bar').then(function (val) {
        expect(val).to.equal('foo');
        done();
      });
    });

    it('should return undefined for invalid data', function(done) {
      cache.get('monkey').then(function (val) {
        expect(val).to.be.an('undefined');
        done();
      });
    });

    it('should set a new value', function() {
      cache.set('name', 'test').then(function () {
        return cache.get('name');
      })
      .then(function (val) {
        expect(val).to.equal('test');
      });
    });

  });
});
