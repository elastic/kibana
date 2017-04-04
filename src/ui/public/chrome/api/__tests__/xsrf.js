import $ from 'jquery';
import expect from 'expect.js';
import { stub } from 'auto-release-sinon';
import ngMock from 'ng_mock';

import xsrfChromeApi from '../xsrf';
import { version } from '../../../../../../package.json';

const xsrfHeader = 'kbn-version';

describe('chrome xsrf apis', function () {
  describe('#getXsrfToken()', function () {
    it('exposes the token', function () {
      const chrome = {};
      xsrfChromeApi(chrome, { version });
      expect(chrome.getXsrfToken()).to.be(version);
    });
  });

  describe('jQuery support', function () {
    it('adds a global jQuery prefilter', function () {
      stub($, 'ajaxPrefilter');
      xsrfChromeApi({}, { version });
      expect($.ajaxPrefilter.callCount).to.be(1);
    });

    describe('jQuery prefilter', function () {
      let prefilter;

      beforeEach(function () {
        stub($, 'ajaxPrefilter');
        xsrfChromeApi({}, { version });
        prefilter = $.ajaxPrefilter.args[0][0];
      });

      it(`sets the ${xsrfHeader} header`, function () {
        const setHeader = stub();
        prefilter({}, {}, { setRequestHeader: setHeader });

        expect(setHeader.callCount).to.be(1);
        expect(setHeader.args[0]).to.eql([
          xsrfHeader,
          version
        ]);
      });

      it('can be canceled by setting the kbnXsrfToken option', function () {
        const setHeader = stub();
        prefilter({ kbnXsrfToken: false }, {}, { setRequestHeader: setHeader });
        expect(setHeader.callCount).to.be(0);
      });
    });

    describe('Angular support', function () {

      let $http;
      let $httpBackend;

      beforeEach(function () {
        stub($, 'ajaxPrefilter');
        const chrome = {};
        xsrfChromeApi(chrome, { version });
        ngMock.module(chrome.$setupXsrfRequestInterceptor);
      });

      beforeEach(ngMock.inject(function ($injector) {
        $http = $injector.get('$http');
        $httpBackend = $injector.get('$httpBackend');

        $httpBackend
          .when('POST', '/api/test')
          .respond('ok');
      }));

      afterEach(function () {
        $httpBackend.verifyNoOutstandingExpectation();
        $httpBackend.verifyNoOutstandingRequest();
      });

      it(`injects a ${xsrfHeader} header on every request`, function () {
        $httpBackend.expectPOST('/api/test', undefined, function (headers) {
          return headers[xsrfHeader] === version;
        }).respond(200, '');

        $http.post('/api/test');
        $httpBackend.flush();
      });

      it('skips requests with the kbnXsrfToken set falsey', function () {
        $httpBackend.expectPOST('/api/test', undefined, function (headers) {
          return !(xsrfHeader in headers);
        }).respond(200, '');

        $http({
          method: 'POST',
          url: '/api/test',
          kbnXsrfToken: 0
        });

        $http({
          method: 'POST',
          url: '/api/test',
          kbnXsrfToken: ''
        });

        $http({
          method: 'POST',
          url: '/api/test',
          kbnXsrfToken: false
        });

        $httpBackend.flush();
      });

      it('treats the kbnXsrfToken option as boolean-y', function () {
        const customToken = `custom:${version}`;
        $httpBackend.expectPOST('/api/test', undefined, function (headers) {
          return headers[xsrfHeader] === version;
        }).respond(200, '');

        $http({
          method: 'POST',
          url: '/api/test',
          kbnXsrfToken: customToken
        });

        $httpBackend.flush();
      });
    });
  });
});
