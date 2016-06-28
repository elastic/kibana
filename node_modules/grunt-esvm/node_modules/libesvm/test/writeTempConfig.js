var expect = require('chai').expect;
var _ = require('lodash');
var writeTempConfig = require('../lib/writeTempConfig');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var temp = Promise.promisifyAll(require('temp'));
var join = require('path').join;

temp.track();

function writeMockConfig(done) {
  temp.mkdirAsync('mockFiles').then(function(dir) {
    return fs.mkdirAsync(join(dir, 'config')).then(function() {
      var tempFiles = ['elasticsearch.json', 'logging.yml'];
      return Promise.all(tempFiles.map(function(file) {
        return fs.writeFileAsync(join(dir, 'config', file), '');
      }));
    }).then(function() {
      done(dir);
    });
  });
}

function removeMockConfig(done) {
  temp.cleanupAsync().then(function(stats) {
    done();
  });
}

describe('write temp config', function () {
  var mockConfigFolder;
  beforeEach(function(done) {
    writeMockConfig(function(dir) {
      mockConfigFolder = dir;
      done();
    });
  });

  it('should create a temp folder with configs', function(done) {
    writeTempConfig({foo: 'bar'}, mockConfigFolder).then(function(path) {
      return fs.readdirAsync(path);
    }).then(function(files) {
      expect(files.indexOf('elasticsearch.json')).to.be.above(-1);
      expect(files.indexOf('logging.yml')).to.be.above(-1);
      done();
    });
  });

  afterEach(function(done) {
    removeMockConfig(function() {
      fs.readdirAsync(mockConfigFolder).then(function(files) {
        throw new Error('mock config should be cleaned up');
      }, function(err) {
        expect(err.cause.code).to.equal('ENOENT');
        done();
      });
    });
  });
});

