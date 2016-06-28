describe('RcFinder', function () {
  var RcFinder = require('../');
  var path = require('path');
  var expect = require('expect.js');
  var fs = require('fs');

  var fixtures = {
    root: path.resolve(__dirname, 'fixtures/foo/foo/foo/foo/'),
    json: path.resolve(__dirname, 'fixtures/foo/foo/bar.json'),
    text: path.resolve(__dirname, 'fixtures/foo/foo/.baz'),
    checkCount: 4,
    config: {
      baz: 'bog'
    }
  };

  it('looks for config files', function () {
    var rcFinder = new RcFinder('bar.json');
    var config = rcFinder.find(path.resolve(__dirname, 'fixtures/foo/foo/foo/foo/'));
    expect(config).to.eql(fixtures.config);
  });

  it('can be run async by using a callback', function (done) {
    var rcFinder = new RcFinder('bar.json');
    var count = 0;
    rcFinder.find(fixtures.root, function (err, config) {
      expect(count).to.eql(1); // prove async
      expect(config).to.eql(fixtures.config);
      done();
    });
    count ++;
  });

  it('caches config objects', function () {
    var count = 0;
    var rcFinder = new RcFinder('bar.json', {
      loader: function (path) {
        count ++;
        return JSON.parse(fs.readFileSync(path));
      }
    });

    var config = rcFinder.find(fixtures.root);
    expect(count).to.eql(1);
    expect(config).to.eql(fixtures.config);

    // it should only be loaded once
    config = rcFinder.find(fixtures.root);
    expect(count).to.eql(1);
    expect(config).to.eql(fixtures.config);
  });

  it('caches config objects from async calls', function (done) {
    var count = 0;
    var rcFinder = new RcFinder('bar.json', {
      loader: function (path, cb) {
        count ++;
        fs.readFile(path, function (err, file) {
          var config;
          if (!err) {
            try {
              config = JSON.parse(file);
            } catch(e) {
              err = cb(new Error(path + ' is not valid JSON: ' + e.message));
            }
          }
          cb(err, config);
        });
      }
    });

    rcFinder.find(fixtures.root, function (err, config) {
      expect(count).to.eql(1);
      expect(config).to.eql(fixtures.config);

      rcFinder.find(fixtures.root, function (err, config) {
        expect(count).to.eql(1);
        expect(config).to.eql(fixtures.config);
        done();
      });
    });
  });

  it('throws an error when called without a callback by an async loader is in use', function () {
    expect(function () {
      var rcFinder = new RcFinder('bar.json', {
        loader: 'async'
      });

      rcFinder.find(fixtures.root);
    }).to.throwException();
  });

  it('properly caches sync lookups when a config file is not found', function () {
    var count = 0;
    var expectedCount = fixtures.checkCount;
    var rcFinder = new RcFinder('bar.json', {
      _syncCheck: function (path) {
        count++;
        return fs.existsSync(path);
      }
    });

    expect(count).to.eql(0);
    rcFinder.find(fixtures.root);
    expect(count).to.eql(expectedCount);
    rcFinder.find(fixtures.root);
    // it should still equal previous count
    expect(count).to.eql(expectedCount);
  });

  it('properly caches async lookups when a config file is not found', function () {
    var count = 0;
    var expectedCount = fixtures.checkCount;
    var rcFinder = new RcFinder('bar.json', {
      _asyncCheck: function (path, cb) {
        count++;
        fs.stat(path, function (err, exists) {
          if (err && err.code !== 'ENOENT') return cb(err);
          cb(void 0, !err);
        });
      }
    });

    expect(count).to.eql(0);
    rcFinder.find(fixtures.root, function (err, config) {
      expect(count).to.eql(expectedCount);
      rcFinder.find(fixtures.root, function (err, config) {
        // it should still equal previous count
        expect(count).to.eql(expectedCount);
      });
    });
  });

  it('throws errors from loader when loading and calling synchronously', function() {
    var rcFinder = new RcFinder('bar.json', {
      loader: function(path) {
        return JSON.parse('{not really json');
      }
    });

    expect(function () {
      var config = rcFinder.find(fixtures.root);
    }).to.throwException('Unexpected token n');
  });

  it('propagates errors from loader when loading synchronously and calling async', function(done) {
    var rcFinder = new RcFinder('bar.json', {
      loader: function(path) {
        return JSON.parse('{not really json');
      }
    });

    rcFinder.find(fixtures.root, function(err, config) {
      expect(err).to.be.an(Error);
      expect(err.message).to.be('Unexpected token n');
      expect(config).to.be(undefined);
      done();
    });
  });

  it('propagates error from loader when loading asynchronously', function(done) {
    var rcFinder = new RcFinder('bar.json', {
      loader: function(path, callback) {
        process.nextTick(function() {
          var err, body;
          try {
            body = JSON.parse('{not really json');
          } catch (e) {
            err = e;
          } finally {
            callback(err, body);
          }
        });
      }
    });

    rcFinder.find(fixtures.root, function(err, config) {
      expect(err).to.be.an(Error);
      expect(err.message).to.be('Unexpected token n');
      expect(config).to.be(undefined);
      done();
    });
  });
});