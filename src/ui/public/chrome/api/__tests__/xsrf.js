/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import $ from 'jquery';
import expect from 'expect.js';
import sinon from 'sinon';
import ngMock from 'ng_mock';

import { initChromeXsrfApi } from '../xsrf';
import { version } from '../../../../../../package.json';

const xsrfHeader = 'kbn-version';

describe('chrome xsrf apis', function () {
  const sandbox = sinon.createSandbox();

  afterEach(function () {
    sandbox.restore();
  });

  describe('#getXsrfToken()', function () {
    it('exposes the token', function () {
      const chrome = {};
      initChromeXsrfApi(chrome, { version });
      expect(chrome.getXsrfToken()).to.be(version);
    });
  });

  describe('jQuery support', function () {
    it('adds a global jQuery prefilter', function () {
      sandbox.stub($, 'ajaxPrefilter');
      initChromeXsrfApi({}, { version });
      expect($.ajaxPrefilter.callCount).to.be(1);
    });

    describe('jQuery prefilter', function () {
      let prefilter;

      beforeEach(function () {
        sandbox.stub($, 'ajaxPrefilter');
        initChromeXsrfApi({}, { version });
        prefilter = $.ajaxPrefilter.args[0][0];
      });

      it(`sets the ${xsrfHeader} header`, function () {
        const setHeader = sinon.stub();
        prefilter({}, {}, { setRequestHeader: setHeader });

        expect(setHeader.callCount).to.be(1);
        expect(setHeader.args[0]).to.eql([
          xsrfHeader,
          version
        ]);
      });

      it('can be canceled by setting the kbnXsrfToken option', function () {
        const setHeader = sinon.stub();
        prefilter({ kbnXsrfToken: false }, {}, { setRequestHeader: setHeader });
        expect(setHeader.callCount).to.be(0);
      });
    });

    describe('Angular support', function () {

      let $http;
      let $httpBackend;

      beforeEach(function () {
        sandbox.stub($, 'ajaxPrefilter');
        const chrome = {};
        initChromeXsrfApi(chrome, { version });
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
