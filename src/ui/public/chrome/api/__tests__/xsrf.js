import $ from 'jquery';
import expect from 'expect.js';
import { stub } from 'auto-release-sinon';
import ngMock from 'ngMock';

import xsrfChromeApi from '../xsrf';

const xsrfHeader = 'kbn-xsrf-header';
const xsrfToken = 'xsrfToken';

describe('chrome xsrf apis', function () {
  context('jQuery support', function () {
    it('adds a global jQuery prefilter', function () {
      stub($, 'ajaxPrefilter');
      xsrfChromeApi({}, {});
      expect($.ajaxPrefilter.callCount).to.be(1);
    });

    context('jQuery prefilter', function () {
      let prefilter;
      const xsrfToken = 'xsrfToken';

      beforeEach(function () {
        stub($, 'ajaxPrefilter');
        xsrfChromeApi({}, { xsrfToken });
        prefilter = $.ajaxPrefilter.args[0][0];
      });

      it('sets the kbn-xsrf-token header', function () {
        const setHeader = stub();
        prefilter({}, {}, { setRequestHeader: setHeader });

        expect(setHeader.callCount).to.be(1);
        expect(setHeader.args[0]).to.eql([
          xsrfHeader,
          xsrfToken
        ]);
      });

      it('can be canceled by setting the kbnXsrfToken option', function () {
        const setHeader = stub();
        prefilter({}, {}, { setRequestHeader: setHeader });

        expect(setHeader.callCount).to.be(1);
        expect(setHeader.args[0]).to.eql([
          xsrfHeader,
          xsrfToken
        ]);
      });
    });

    context('Angular support', function () {

      let $http;
      let $httpBackend;

      beforeEach(function () {
        stub($, 'ajaxPrefilter');
        const chrome = {};
        xsrfChromeApi(chrome, { xsrfToken });
        ngMock.module(chrome.$setupCsrfRequestInterceptor);
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

      it('injects a kbn-xsrf-token header on every request', function () {
        $httpBackend.expectPOST('/api/test', undefined, function (headers) {
          return headers[xsrfHeader] === xsrfToken;
        }).respond(200, '');

        $http.post('/api/test');
        $httpBackend.flush();
      });

      it('skips requests with the kbnCsrfToken set falsey', function () {
        $httpBackend.expectPOST('/api/test', undefined, function (headers) {
          return !(xsrfHeader in headers);
        }).respond(200, '');

        $http.post({
          url: '/api/test',
          xsrfHeader: 0
        });

        $http.post({
          url: '/api/test',
          xsrfHeader: ''
        });

        $http.post({
          url: '/api/test',
          xsrfHeader: false
        });

        $httpBackend.flush();
      });
    });
  });
});
