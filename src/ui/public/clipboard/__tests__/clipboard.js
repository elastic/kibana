
var angular = require('angular');
var _ = require('lodash');
var sinon = require('auto-release-sinon');
var expect = require('expect.js');
var $ = require('jquery');
var ngMock = require('ngMock');

require('ui/clipboard');

describe('Clipboard directive', function () {
  var $scope;
  var $rootScope;
  var $compile;
  var $interpolate;
  var el;
  var tips;

  function init() {
    // load the application
    ngMock.module('kibana');

    ngMock.inject(function (_$rootScope_, _$compile_, _$interpolate_) {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
      $interpolate = _$interpolate_;
      $rootScope.text = 'foo';

      el = $compile('<kbn-clipboard copy="text"></kbn-clipboard>')($rootScope);

      $scope = el.scope();
      $scope.$digest();
    });
  }

  describe.skip('With flash disabled', function () {
    beforeEach(function () {
      this.timeout(5000);
      sinon.stub(window.ZeroClipboard, 'isFlashUnusable', _.constant(true));
      init();
    });

    it('should be an empty element', function () {
      expect(el.children()).to.have.length(0);
    });

    it('should not show the tooltip', function () {
      var clip = el.find('[tooltip]');
      expect(clip).to.have.length(0);
    });

    it('should not show the clipboard button', function () {
      var clip = el.find('[clip-copy]');
      expect(clip).to.have.length(0);
    });
  });

  describe.skip('With flash enabled', function () {
    beforeEach(function () {
      this.timeout(5000);
      sinon.stub(window.ZeroClipboard, 'isFlashUnusable', _.constant(false));
      init();
    });

    it('should contain an element with clip-copy', function () {
      var clip = el.find('[clip-copy]');
      expect(clip).to.have.length(1);
    });

    it('should have a tooltip', function () {
      var clip = el.find('[tooltip]');
      expect(clip).to.have.length(1);

      var clipText = $interpolate($(clip).attr('tooltip'))();
      expect(clipText).to.be('Copy to clipboard');

    });

    it('should change the tooltip text when clicked, back when mouse leaves', function () {
      el.mouseenter();
      el.click();
      $scope.$digest();

      var clipText = $interpolate($('[tooltip]', el).attr('tooltip'))();
      expect(clipText).to.be('Copied!');

      el.mouseleave();
      $scope.$digest();

      clipText = $interpolate($('[tooltip]', el).attr('tooltip'))();
      expect(clipText).to.be('Copy to clipboard');
    });

    it('should unbind all handlers on destroy', function () {
      var handlers = $._data(el.get(0), 'events');
      expect(Object.keys(handlers)).to.have.length(2);

      $scope.$destroy();
      expect(Object.keys(handlers)).to.have.length(0);
    });
  });
});
