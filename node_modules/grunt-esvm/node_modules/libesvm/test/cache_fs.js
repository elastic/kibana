var fs = require('fs');
var expect = require('chai').expect;
var cache = require('../lib/cache');
var temp = require('temp').track();

describe('Cache', function() {
  describe('File operations', function() {
    after(function (done) {
      temp.cleanup(done);
    });

    it('should return an empty object when fetch is called and the cache is new', function (done) {
      temp.open('empty-test', function (err, filename) {
        cache.source = filename.path;
        cache.fetch().then(function (data) {
          expect(data).to.be.empty;
          done();
        })
        .catch(done);
      });
    });

    it('should save a new value on set', function (done) {
      temp.open('set-test', function (err, filename) {
        cache.source = filename.path;
        cache.set('myTest', 'test', function (err) {
          var contents = fs.readFileSync(filename.path, { encoding: 'utf8' });
          var data = JSON.parse(contents);

          expect(data).to.have.property('myTest', 'test');
          done();
        });
      });
    });

    it('should save a new value on save', function (done) {
      temp.open('save-test', function (err, filename) {
        cache.source = filename.path;
        cache.set('myTest', 'test')
        .then(function () {
          cache.save(function (err) {
            var contents = fs.readFileSync(filename.path, { encoding: 'utf8' });
            var data = JSON.parse(contents);

            expect(data).to.have.property('myTest', 'test');
            done();
          });
        });
      });
    });
  });
});
