import indexPatternEndpoints from '../index_pattern_endpoints';
import _ from 'lodash';
import expect from 'expect.js';

var src = require('requirefrom')('src');
var KbnServer = src('server/KbnServer');
var fromRoot = src('utils/fromRoot');

describe('plugins/api', function () {
  describe('index_pattern_endpoints', function () {
    var kbnServer;

    before(function () {
      kbnServer = new KbnServer({
        server: {autoListen: false},
        logging: {quiet: true},
        plugins: {
          scanDirs: [
            fromRoot('src/plugins')
          ]
        },
        optimize: {
          enabled: false
        }
      });

      return kbnServer.ready();
    });

    after(function () {
      return kbnServer.close();
    });

    describe('POST index-patterns', function () {
      let response;

      beforeEach(function (done) {
        kbnServer.server.inject({
          method: 'POST',
          url: '/api/index-patterns',
          payload: {
            title: 'logstash-*',
            timeFieldName: '@timestamp',
            fields: '[{\"name\":\"referer\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"indexed\":true,' +
            '\"analyzed\":false,\"doc_values\":true}]'
          }
        }, function (res) {
          response = res;
          done();
        });
      });

      it('should return 200 and successfully create an index pattern', function () {
        expect(response.statusCode).to.be(200);
      });
    });

    describe('GET index-patterns', function () {
      let response;

      beforeEach(function (done) {
        kbnServer.server.inject({
          method: 'GET',
          url: '/api/index-patterns'
        }, function (res) {
          response = res;
          done();
        });
      });

      it('should return 200', function () {
        expect(response.statusCode).to.be(200);
      });
    });
  });
});
