var sinon = require('auto-release-sinon');
var ngMock = require('ngMock');
var $ = require('jquery');
var expect = require('expect.js');
var constant = require('lodash').constant;
var set = require('lodash').set;
var cloneDeep = require('lodash').cloneDeep;
var indexBy = require('lodash').indexBy;

require('ui/chrome');
require('ui/chrome/appSwitcher');

describe('appSwitcher directive', function () {
  var env;

  beforeEach(ngMock.module('kibana', function ($provide) {
    $provide.decorator('$window', function ($delegate) {
      return Object.create($delegate, set({}, 'location.value', Object.create($delegate.location)));
    });
  }));

  function setup(href, links) {
    return ngMock.inject(function ($window, $rootScope, $compile) {
      $rootScope.chrome = {
        getNavLinks: constant(cloneDeep(links)),
      };

      env = {
        $scope: $rootScope,
        $el: $compile($('<app-switcher>'))($rootScope),
        $links: $rootScope.chrome.getNavLinks(),
        currentHref: href,
        location: $window.location
      };

      Object.defineProperties($window.location, {
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

  context('when one links is for the active app', function () {
    var myLink = {
      active: true,
      title: 'myLink',
      url: 'http://localhost:555/app/myApp',
      lastSubUrl: 'http://localhost:555/app/myApp#/lastSubUrl'
    };

    var notMyLink = {
      active: false,
      title: 'notMyLink',
      url: 'http://localhost:555/app/notMyApp',
      lastSubUrl: 'http://localhost:555/app/notMyApp#/lastSubUrl'
    };

    beforeEach(setup('http://localhost:5555/app/myApp/', [myLink, notMyLink]));

    it('links to the active apps base url', function () {
      var $myLink = env.$el.findTestSubject('appLink').eq(0);
      expect($myLink.prop('href')).to.be(myLink.url);
      expect($myLink.prop('href')).to.not.be(myLink.lastSubUrl);
    });

    it('links to the inactive apps last sub url', function () {
      var $notMyLink = env.$el.findTestSubject('appLink').eq(1);
      expect($notMyLink.prop('href')).to.be(notMyLink.lastSubUrl);
      expect($notMyLink.prop('href')).to.not.be(notMyLink.url);
    });
  });

  context('when none of the links are for the active app', function () {
    var myLink = {
      active: false,
      title: 'myLink',
      url: 'http://localhost:555/app/myApp',
      lastSubUrl: 'http://localhost:555/app/myApp#/lastSubUrl'
    };

    var notMyLink = {
      active: false,
      title: 'notMyLink',
      url: 'http://localhost:555/app/notMyApp',
      lastSubUrl: 'http://localhost:555/app/notMyApp#/lastSubUrl'
    };

    beforeEach(setup('http://localhost:5555/app/myApp/', [myLink, notMyLink]));

    it('links to the lastSubUrl for each', function () {
      var $links = env.$el.findTestSubject('appLink');
      var $myLink = $links.eq(0);
      var $notMyLink = $links.eq(1);

      expect($myLink.prop('href')).to.be(myLink.lastSubUrl);
      expect($myLink.prop('href')).to.not.be(myLink.url);

      expect($notMyLink.prop('href')).to.be(notMyLink.lastSubUrl);
      expect($notMyLink.prop('href')).to.not.be(notMyLink.url);
    });
  });

  context('clicking a link that matches entire url', function () {
    var url = 'http://localhost:555/app/myApp#/lastSubUrl';
    beforeEach(setup(url, [
      { url: url }
    ]));

    it('calls window.location.reload and prevents default behavior', function () {
      var event = new $.Event('click');

      expect(env.location.reload.callCount).to.be(0);
      expect(event.isDefaultPrevented()).to.be(false);
      expect(event.isPropagationStopped()).to.be(false);

      var $link = env.$el.findTestSubject('appLink');
      expect($link.prop('href')).to.be(env.currentHref);
      $link.trigger(event);

      expect(event.isPropagationStopped()).to.be(false);
      expect(event.isDefaultPrevented()).to.be(true);
      expect(env.location.reload.callCount).to.be(1);
    });
  });

  context('clicking a link with matching href except different hash', function () {
    var url = 'http://localhost:555/app/myApp?query=1';
    beforeEach(setup(url + '#/lastSubUrl', [
      { url: url }
    ]));

    it('calls window.location.reload and prevents default behavior', function () {
      var event = new $.Event('click');

      expect(env.location.reload.callCount).to.be(0);
      expect(event.isDefaultPrevented()).to.be(false);
      expect(event.isPropagationStopped()).to.be(false);

      var $link = env.$el.findTestSubject('appLink');
      expect($link.prop('href')).to.be(url);
      $link.trigger(event);

      expect(event.isPropagationStopped()).to.be(false);
      expect(event.isDefaultPrevented()).to.be(true);
      expect(env.location.reload.callCount).to.be(1);
    });
  });

  context('clicking a link with matching host', function () {
    beforeEach(setup('http://localhost:555/someOtherPath', [
      {
        active: true,
        url: 'http://localhost:555/app/myApp'
      }
    ]));

    it('allows click through', function () {
      var event = new $.Event('click');

      expect(env.location.reload.callCount).to.be(0);
      expect(event.isPropagationStopped()).to.be(false);

      env.$el.findTestSubject('appLink').trigger(event);

      expect(env.location.reload.callCount).to.be(0);
      expect(event.isPropagationStopped()).to.be(false);
    });
  });

  context('clicking a link with matching host and path', function () {
    beforeEach(setup('http://localhost:555/app/myApp?someQuery=true', [
      {
        active: true,
        url: 'http://localhost:555/app/myApp?differentQuery=true'
      }
    ]));

    it('allows click through', function () {
      var event = new $.Event('click');

      expect(env.location.reload.callCount).to.be(0);
      expect(event.isPropagationStopped()).to.be(false);

      env.$el.findTestSubject('appLink').trigger(event);

      expect(env.location.reload.callCount).to.be(0);
      expect(event.isPropagationStopped()).to.be(false);
    });
  });

});
