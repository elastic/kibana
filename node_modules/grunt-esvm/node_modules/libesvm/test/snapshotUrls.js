var expect = require('chai').expect;
var _ = require('lodash');
var relative = require('path').relative;
var join = require('path').join;
var Promise = require('bluebird');
var unlinkAsync = Promise.promisify(require('fs').unlink);
var exists = require('fs').existsSync;
var request = require('request');

var cache = require('../lib/cache');
var getSnapshotUrls = require('../lib/getSnapshotUrls');
var resolveSnapshotUrlsPath = require('../lib/resolveSnapshotUrlsPath');

describe('Snapshot Urls', function () {
  describe('local path', function () {
    it('stores in the install directory', function () {
      return resolveSnapshotUrlsPath({
        directory: __dirname
      }).then(function (path) {
        expect(relative(__dirname, path)).to.equal('snapshot_urls.prop');
      });
    });
  });

  describe('get', function () {
    var config;
    var snapshotUrlsPath;

    beforeEach(function () {
      config = {
        directory: __dirname
      };

      spy(request, 'get');

      return resolveSnapshotUrlsPath(config)
      .then(function (_snapPath) {
        snapshotUrlsPath = _snapPath;
      })
      .then(cleanUpGeneratedFiles);
    });

    afterEach(cleanUpGeneratedFiles);

    it('stores the fetch list at the snapshot path', function () {
      return getSnapshotUrls(config)
      .then(function (list) {
        expect(exists(snapshotUrlsPath)).to.equal(true);
      });
    });

    it('only fetches when the cached copy is over 120 seconds old', function () {
      return getSnapshotUrls(config)
      .then(function (list) {
        expect(request.get.callCount).to.equal(1);
        return getSnapshotUrls(config)
        .then(function (list2) {
          expect(list).to.not.equal(list2);
          expect(list).to.eql(list2);
          expect(request.get.callCount).to.equal(1);
        });
      });
    });

    var agents = [];
    function spy(obj, prop) {
      var orig = obj[prop];

      var agent = function () {
        agent.callCount += 1;
        return orig.apply(this, arguments);
      };

      agent.orig = orig;
      agent.callCount = 0;
      agents.push([obj, prop]);

      obj[prop] = agent;
    }

    afterEach(function () {
      _.forEachRight(agents.splice(0), function (agent) {
        var obj = agent[0];
        var prop = agent[1];
        obj[prop] = obj[prop].orig;
      });
    });

    function allowNoEnt(prom) {
      return prom.catch(function (err) {
        if (err.cause.code === 'ENOENT') return null;
        throw err;
      });
    }

    function cleanUpGeneratedFiles() {
      return Promise.all([
        allowNoEnt(unlinkAsync(cache.source)),
        allowNoEnt(unlinkAsync(snapshotUrlsPath))
      ]);
    }
  });
});

