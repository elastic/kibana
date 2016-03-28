/* jshint mocha:true */

var unlink = require('bluebird').promisify(require('fs').unlink);
var sinon = require('sinon');
var expect = require('chai').expect;
var Promise = require('bluebird');

var fetch = require('../lib/fetchAllTags');
var cache = require('../lib/cache');
var utils = require('../lib/utils');

var fourMinutes = 1000 * 60 * 4;
var sixMinutes = 1000 * 60 * 6;

describe('fetchAllTags', function () {
  describe('sets the etag', function () {
    var get, set, request, etag, tags;

    beforeEach(function () {
      get = sinon.stub(cache, 'get');
      get.withArgs('tags').returns(Promise.resolve());
      get.withArgs('tagsEtag').returns(Promise.resolve());
      get.withArgs('tagsEtagRefreshedAt').returns(Promise.resolve());

      etag = {};
      tags = [];

      set = sinon.stub(cache, 'set').returns(Promise.resolve());

      request = sinon.stub(utils, 'request').returns(Promise.resolve([
        { statusCode: 200, headers: { etag: etag } }, tags
      ]));
    });

    it('', function () {
      return fetch()
      .then(function (tags) {
        expect(tags).to.be.equal(tags);
        expect(set.callCount).to.be.equal(3);
        expect(set.calledWith('tags', tags)).to.be.equal(true);
        expect(set.calledWith('tagsEtag', etag)).to.be.equal(true);
      });
    });

    afterEach(function () {
      get.restore();
      set.restore();
      request.restore();
    });
  });

  describe('resuses the etag and set refreshedAt', function () {
    var get, set, request, etag, tags;

    beforeEach(function () {
      etag = {};
      tags = [];

      get = sinon.stub(cache, 'get');
      get.withArgs('tags').returns(Promise.resolve(tags));
      get.withArgs('tagsEtag').returns(Promise.resolve(etag));
      get.withArgs('tagsEtagRefreshedAt').returns();

      set = sinon.stub(cache, 'set').returns(Promise.resolve());

      request = sinon.stub(utils, 'request').returns(Promise.resolve([
        { statusCode: 304, headers: { etag: etag } }, undefined
      ]));
    });

    it('', function () {
      return fetch()
      .then(function (tags) {
        expect(tags).to.be.equal(tags);
        expect(set.callCount).to.be.equal(2);
        expect(set.calledWith('tagsEtag', etag)).to.be.equal(true);
        expect(set.calledWith('tagsEtagRefreshedAt')).to.be.equal(true);
      });
    });

    afterEach(function () {
      get.restore();
      set.restore();
      request.restore();
    });
  });

  describe('skips the fetch if the refreshedAt is within 5 minutes', function () {
    var get, set, request, etag, tags;

    beforeEach(function () {
      etag = {};
      tags = [];

      get = sinon.stub(cache, 'get');
      get.withArgs('tags').returns(Promise.resolve(tags));
      get.withArgs('tagsEtag').returns(Promise.resolve(etag));
      get.withArgs('tagsEtagRefreshedAt').returns(Promise.resolve(Date.now() - fourMinutes));

      set = sinon.stub(cache, 'set').returns(Promise.resolve());

      request = sinon.stub(utils, 'request').returns({
        then: function () {
          return Promise.reject(new Error('request should have been skipped'));
        }
      });
    });

    it('', function () {
      return fetch()
      .then(function (tags) {
        expect(tags).to.be.equal(tags);
        expect(set.callCount).to.be.equal(0);
      });
    });

    afterEach(function () {
      get.restore();
      set.restore();
      request.restore();
    });
  });

  describe('skips the fetch if the refreshedAt is within 5 minutes', function () {
    var get, set, request, etag, tags;

    beforeEach(function () {
      etag = {};
      tags = [];

      get = sinon.stub(cache, 'get');
      get.withArgs('tags').returns(Promise.resolve(tags));
      get.withArgs('tagsEtag').returns(Promise.resolve(etag));
      get.withArgs('tagsEtagRefreshedAt').returns(Promise.resolve(Date.now() - sixMinutes));

      set = sinon.stub(cache, 'set').returns(Promise.resolve());

      request = sinon.stub(utils, 'request').returns(Promise.resolve([
        { statusCode: 304, headers: { etag: etag } }, undefined
      ]));
    });

    it('', function () {
      return fetch()
      .then(function (tags) {
        expect(tags).to.be.equal(tags);
        expect(set.callCount).to.be.equal(2);
        expect(set.calledWith('tagsEtag', etag)).to.be.equal(true);
        expect(set.calledWith('tagsEtagRefreshedAt')).to.be.equal(true);
      });
    });

    afterEach(function () {
      get.restore();
      set.restore();
      request.restore();
    });
  });
});