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

import * as Rx from 'rxjs';
import sinon from 'sinon';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import chrome from 'ui/chrome';

import { DomLocationProvider } from '../../../../../dom_location';
import { cloneDeep } from 'lodash';
import $ from 'jquery';
import '../app_switcher';

describe('appSwitcher directive', function () {
  let env;

  beforeEach(ngMock.module('kibana'));
  afterEach(() => {
    chrome.navLinks.get$.restore();
  });

  function setup(href, links) {
    return ngMock.inject(function ($rootScope, $compile, Private) {
      sinon.stub(chrome.navLinks, 'get$').callsFake(() => (
        links instanceof Rx.Observable ? links : Rx.of(cloneDeep(links))
      ));

      const domLocation = Private(DomLocationProvider);

      const $el = $compile($('<app-switcher chrome="chrome">'))($rootScope);
      env = {
        $el,
        $scope: $el.scope(),
        controller: $el.isolateScope().switcher,
        currentHref: href,
        location: domLocation
      };

      Object.defineProperties(domLocation, {
        href: {
          get: function () { return env.currentHref; },
          set: function (val) { return env.currentHref = val; },
        },
        reload: {
          value: sinon.stub()
        }
      });

      env.$scope.$digest();
    });
  }

  describe('when one link is for the active app', function () {
    const myLink = {
      active: true,
      title: 'myLink',
      url: 'http://localhost:555/app/myApp',
      lastSubUrl: 'http://localhost:555/app/myApp#/lastSubUrl',
      linkToLastSubUrl: true,
    };

    const notMyLink = {
      active: false,
      title: 'notMyLink',
      url: 'http://localhost:555/app/notMyApp',
      lastSubUrl: 'http://localhost:555/app/notMyApp#/lastSubUrl',
      linkToLastSubUrl: true,
    };

    beforeEach(setup('http://localhost:5555/app/myApp/', [myLink, notMyLink]));

    it('links to the inactive apps base url', function () {
      const $myLink = env.$el.findTestSubject('appLink').eq(0);
      expect($myLink.prop('href')).to.be(myLink.url);
      expect($myLink.prop('href')).to.not.be(myLink.lastSubUrl);
    });

    it('links to the inactive apps last sub url', function () {
      const $notMyLink = env.$el.findTestSubject('appLink').eq(1);
      expect($notMyLink.prop('href')).to.be(notMyLink.lastSubUrl);
      expect($notMyLink.prop('href')).to.not.be(notMyLink.url);
    });
  });

  describe('when none of the links are for the active app', function () {
    const myLink = {
      active: false,
      title: 'myLink',
      url: 'http://localhost:555/app/myApp',
      lastSubUrl: 'http://localhost:555/app/myApp#/lastSubUrl',
      linkToLastSubUrl: true,
    };

    const notMyLink = {
      active: false,
      title: 'notMyLink',
      url: 'http://localhost:555/app/notMyApp',
      lastSubUrl: 'http://localhost:555/app/notMyApp#/lastSubUrl',
      linkToLastSubUrl: true,
    };

    beforeEach(setup('http://localhost:5555/app/myApp/', [myLink, notMyLink]));

    it('links to the lastSubUrl for each', function () {
      const $links = env.$el.findTestSubject('appLink');
      const $myLink = $links.eq(0);
      const $notMyLink = $links.eq(1);

      expect($myLink.prop('href')).to.be(myLink.lastSubUrl);
      expect($myLink.prop('href')).to.not.be(myLink.url);

      expect($notMyLink.prop('href')).to.be(notMyLink.lastSubUrl);
      expect($notMyLink.prop('href')).to.not.be(notMyLink.url);
    });
  });

  describe('when links have linkToLastSubUrl: false', function () {
    beforeEach(setup('http://localhost:5555/app/myApp/', [{
      active: false,
      title: 'myLink',
      url: 'http://localhost:555/app/myApp',
      lastSubUrl: 'http://localhost:555/app/myApp#/lastSubUrl',
      linkToLastSubUrl: false,
    }]));

    it('links to the default url', function () {
      const [link] = env.$el.findTestSubject('appLink');
      expect(link.href).to.be('http://localhost:555/app/myApp');
      expect(link.href).to.not.be('http://localhost:555/app/myApp#/lastSubUrl');
    });
  });

  describe('clicking a link with matching href but missing hash', function () {
    const url = 'http://localhost:555/app/myApp?query=1';
    beforeEach(setup(url + '#/lastSubUrl', [
      { url: url }
    ]));

    it('just prevents propagation (no reload)', function () {
      const event = new $.Event('click');

      expect(env.location.reload.callCount).to.be(0);
      expect(event.isDefaultPrevented()).to.be(false);
      expect(event.isPropagationStopped()).to.be(false);

      const $link = env.$el.findTestSubject('appLink');
      expect($link.prop('href')).to.be(url);
      $link.trigger(event);

      expect(env.location.reload.callCount).to.be(0);
      expect(event.isDefaultPrevented()).to.be(false);
      expect(event.isPropagationStopped()).to.be(true);
    });
  });

  describe('clicking a link that matches entire url', function () {
    const url = 'http://localhost:555/app/myApp#/lastSubUrl';
    beforeEach(setup(url, [
      { url: url }
    ]));

    it('calls window.location.reload and prevents propagation', function () {
      const event = new $.Event('click');

      expect(env.location.reload.callCount).to.be(0);
      expect(event.isDefaultPrevented()).to.be(false);
      expect(event.isPropagationStopped()).to.be(false);

      const $link = env.$el.findTestSubject('appLink');
      expect($link.prop('href')).to.be(env.currentHref);
      $link.trigger(event);

      expect(env.location.reload.callCount).to.be(1);
      expect(event.isDefaultPrevented()).to.be(false);
      expect(event.isPropagationStopped()).to.be(true);
    });
  });

  describe('clicking a link with matching href but changed hash', function () {
    const rootUrl = 'http://localhost:555/app/myApp?query=1';
    const url = rootUrl + '#/lastSubUrl2';

    beforeEach(setup(url + '#/lastSubUrl', [
      { url: url }
    ]));

    it('calls window.location.reload and prevents propagation', function () {
      const event = new $.Event('click');

      expect(env.location.reload.callCount).to.be(0);
      expect(event.isDefaultPrevented()).to.be(false);
      expect(event.isPropagationStopped()).to.be(false);

      const $link = env.$el.findTestSubject('appLink');
      expect($link.prop('href')).to.be(url);
      $link.trigger(event);

      expect(env.location.reload.callCount).to.be(1);
      expect(event.isDefaultPrevented()).to.be(false);
      expect(event.isPropagationStopped()).to.be(true);
    });
  });

  describe('clicking a link with matching host', function () {
    beforeEach(setup('http://localhost:555/someOtherPath', [
      {
        active: true,
        url: 'http://localhost:555/app/myApp'
      }
    ]));

    it('allows click through', function () {
      const event = new $.Event('click');

      expect(env.location.reload.callCount).to.be(0);
      expect(event.isPropagationStopped()).to.be(false);

      env.$el.findTestSubject('appLink').trigger(event);

      expect(env.location.reload.callCount).to.be(0);
      expect(event.isPropagationStopped()).to.be(false);
    });
  });

  describe('clicking a link with matching host and path', function () {
    beforeEach(setup('http://localhost:555/app/myApp?someQuery=true', [
      {
        active: true,
        url: 'http://localhost:555/app/myApp?differentQuery=true'
      }
    ]));

    it('allows click through', function () {
      const event = new $.Event('click');

      expect(env.location.reload.callCount).to.be(0);
      expect(event.isPropagationStopped()).to.be(false);

      env.$el.findTestSubject('appLink').trigger(event);

      expect(env.location.reload.callCount).to.be(0);
      expect(event.isPropagationStopped()).to.be(false);
    });
  });

  describe('navLinks update', () => {
    it('applies navLink updates in a sync digest cycle', () => {
      const navLinks$ = new Rx.Subject();
      setup('http://localhost:555/app/foo', navLinks$);
      const { controller } = env;

      expect(controller.links).to.be(undefined);
      navLinks$.next([]);
      expect(controller.links).to.eql([]);
    });

    it('persists the $$hashKey on navLink updates', () => {
      const navLinks$ = new Rx.Subject();
      setup('http://localhost:555/app/myApp', navLinks$);
      const { controller, $scope } = env;

      navLinks$.next([{ id: 'foo' }]);
      $scope.$digest();
      const [link] = controller.links;
      expect(link.id).to.be('foo');
      expect(link.$$hashKey).to.be.ok();

      navLinks$.next([{ id: 'foo', lastSubUrl: '#/foo/bar' }]);
      $scope.$digest();

      const [newLink] = controller.links;
      expect(newLink.id).to.be(link.id);
      expect(newLink.$$hashKey).to.be(link.$$hashKey);
      expect(newLink.lastSubUrl).to.be('#/foo/bar');
    });
  });
});
