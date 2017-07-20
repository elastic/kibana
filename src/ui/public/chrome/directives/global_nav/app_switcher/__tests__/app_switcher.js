import sinon from 'sinon';
import ngMock from 'ng_mock';
import expect from 'expect.js';

import { DomLocationProvider } from 'ui/dom_location';
import { constant } from 'lodash';
import { cloneDeep } from 'lodash';
import $ from 'jquery';
import 'ui/chrome';
import '../app_switcher';

describe('appSwitcher directive', function () {
  let env;

  beforeEach(ngMock.module('kibana'));

  function setup(href, links) {
    return ngMock.inject(function ($window, $rootScope, $compile, Private) {
      const domLocation = Private(DomLocationProvider);

      $rootScope.chrome = {
        getNavLinks: constant(cloneDeep(links)),
      };

      env = {
        $scope: $rootScope,
        $el: $compile($('<app-switcher chrome="chrome">'))($rootScope),
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
      lastSubUrl: 'http://localhost:555/app/myApp#/lastSubUrl'
    };

    const notMyLink = {
      active: false,
      title: 'notMyLink',
      url: 'http://localhost:555/app/notMyApp',
      lastSubUrl: 'http://localhost:555/app/notMyApp#/lastSubUrl'
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
      lastSubUrl: 'http://localhost:555/app/myApp#/lastSubUrl'
    };

    const notMyLink = {
      active: false,
      title: 'notMyLink',
      url: 'http://localhost:555/app/notMyApp',
      lastSubUrl: 'http://localhost:555/app/notMyApp#/lastSubUrl'
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

  describe('clicking a link with matching href but missing hash', function () {
    const url = 'http://localhost:555/app/myApp?query=1';
    beforeEach(setup(url + '#/lastSubUrl', [
      { url: url }
    ]));

    it('just prevents propogation (no reload)', function () {
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

    it('calls window.location.reload and prevents propogation', function () {
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

    it('calls window.location.reload and prevents propogation', function () {
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

});
