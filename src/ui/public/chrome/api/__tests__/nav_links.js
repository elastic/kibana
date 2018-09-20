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

import ngMock from 'ng_mock';
import sinon from 'sinon';
import expect from 'expect.js';

import { hashUrl, getUnhashableStatesProvider } from 'ui/state_management/state_hashing';
import { initChromeNavLinksApi } from '../nav_links';

const sandbox = sinon.createSandbox();

function setup() {
  const chrome = {
    getBasePath: () => '/base/path'
  };

  const internal = {};
  let $route;
  let getUnhashableStates;

  initChromeNavLinksApi(chrome, internal);

  ngMock.module('kibana', ($routeProvider) => {
    $routeProvider.when('/foo/bar', {
      redirectTo: '/foo/baz',
    });
    $routeProvider.when('/foo/baz', {
      template: 'baz',
    });
  });

  sandbox.stub(chrome.navLinks, 'setUrlInterceptor').callsFake(() => {
    //noop
  });

  sandbox.stub(chrome.navLinks, 'filterLastUrls').callsFake(() => {
    //noop
  });

  ngMock.inject(internal.navLinksAngularInit, ($injector, Private, config) => {
    $route = $injector.get('$route');
    getUnhashableStates = Private(getUnhashableStatesProvider);
    config.set('state:storeInSessionStorage', true);
  });

  return { chrome, $route, getUnhashableStates };
}

describe('navLinks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    sandbox.restore();
    ngMock.inject((config) => {
      config.set('state:storeInSessionStorage', false);
    });
  });

  describe('urlInterceptor', () => {
    it('is registered with newPlatformNavLinks', () => {
      const { chrome } = setup();
      sinon.assert.calledOnce(chrome.navLinks.setUrlInterceptor);
    });

    it('returns url with unhashed states', () => {
      const { chrome, getUnhashableStates } = setup();

      const [interceptor] = chrome.navLinks.setUrlInterceptor.getCall(0).args;
      const url = 'http://localhost:5601/base/path/app/kibana#/url?_g=(a:b)';

      const hashedUrl = hashUrl(getUnhashableStates(), url);
      expect(hashedUrl).not.to.be(url);

      const interceptedUrl = interceptor(hashedUrl);
      expect(interceptedUrl).to.be(url);
    });

    it('filters out urls for redirect routes', () => {
      const { chrome } = setup();
      const [interceptor] = chrome.navLinks.setUrlInterceptor.getCall(0).args;
      expect(interceptor('http://localhost:5601/base/path/app/kibana#/foo/bar')).to.be(undefined);
    });
  });

  describe('lastUrl filter', () => {
    it('filters during initialization', () => {
      const { chrome } = setup();
      sinon.assert.calledOnce(chrome.navLinks.filterLastUrls);
    });

    it('returns true for urls that do not match routes', () => {
      const { chrome } = setup();
      const [filter] = chrome.navLinks.filterLastUrls.getCall(0).args;
      expect(filter('http://google.com')).to.be(true);
    });

    it('returns true for urls that point to non-redirect routes', () => {
      const { chrome } = setup();
      const [filter] = chrome.navLinks.filterLastUrls.getCall(0).args;
      expect(filter('http://localhost:5601/base/path/app/kibana#/foo/baz')).to.be(true);
    });

    it('returns false for urls that point to redirect routes', () => {
      const { chrome } = setup();
      const [filter] = chrome.navLinks.filterLastUrls.getCall(0).args;
      expect(filter('http://localhost:5601/base/path/app/kibana#/foo/bar')).to.be(false);
    });
  });
});
