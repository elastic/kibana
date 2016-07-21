
require('ui/fixedScroll');
var expect = require('expect.js');
var ngMock = require('ngMock');

describe('FixedScroll directive', function () {
  var $ = require('jquery');
  var sinon = require('auto-release-sinon');
  var Promise = require('bluebird');

  var compile;
  var trash = [];

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($compile, $rootScope) {

    compile = function (ratioY, ratioX) {
      if (ratioX == null) ratioX = ratioY;

      // since the directive works at the sibling level we create a
      // parent for everything to happen in
      var $parent = $('<div>').css({
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      });

      $parent.appendTo(document.body);
      trash.push($parent);

      var $el = $('<div fixed-scroll></div>').css({
        'overflow-x': 'auto',
        'width': $parent.width()
      }).appendTo($parent);

      var $content = $('<div>').css({
        width: $parent.width() * ratioX,
        height: $parent.height() * ratioY
      }).appendTo($el);

      $compile($parent)($rootScope);
      $rootScope.$digest();

      return {
        $container: $el,
        $content: $content,
        $scroller: $parent.find('.fixed-scroll-scroller')
      };
    };

  }));

  afterEach(function () {
    trash.splice(0).forEach(function ($el) {
      $el.remove();
    });
  });

  it('does nothing when not needed', function () {
    var els = compile(0.5, 1.5);
    expect(els.$scroller).to.have.length(0);

    els = compile(1.5, 0.5);
    expect(els.$scroller).to.have.length(0);
  });

  it('attaches a scroller below the element when the content is larger then the container', function () {
    var els = compile(1.5);
    expect(els.$scroller).to.have.length(1);
  });

  it('copies the width of the container', function () {
    var els = compile(1.5);
    expect(els.$scroller.width()).to.be(els.$container.width());
  });

  it('mimics the scrollWidth of the element', function () {
    var els = compile(1.5);
    expect(els.$scroller.prop('scrollWidth')).to.be(els.$container.prop('scrollWidth'));
  });

  describe('scroll event handling / tug of war prevention', function () {
    it('listens when needed, unlistens when not needed', function () {
      var on = sinon.spy($.fn, 'on');
      var off = sinon.spy($.fn, 'off');

      var els = compile(1.5);
      expect(on.callCount).to.be(2);
      checkThisVals('$.fn.on', on);

      expect(off.callCount).to.be(0);
      els.$container.width(els.$container.prop('scrollWidth'));
      els.$container.scope().$digest();
      expect(off.callCount).to.be(2);
      checkThisVals('$.fn.off', off);

      function checkThisVals(name, spy) {
        // the this values should be different
        expect(spy.thisValues[0].is(spy.thisValues[1])).to.be(false);
        // but they should be either $scroller or $container
        spy.thisValues.forEach(function ($this) {
          if ($this.is(els.$scroller) || $this.is(els.$container)) return;
          expect.fail('expected ' + name + ' to be called with $scroller or $container');
        });
      }
    });

    [
      { from: '$container', to: '$scroller' },
      { from: '$scroller', to: '$container' }
    ].forEach(function (names) {
      describe('scroll events ' + JSON.stringify(names), function () {
        var spy;
        var els;
        var $from;
        var $to;

        beforeEach(function () {
          spy = sinon.spy($.fn, 'scrollLeft');
          els = compile(1.5);
          $from = els[names.from];
          $to = els[names.to];
        });

        it('transfers the scrollLeft', function () {
          expect(spy.callCount).to.be(0);
          $from.scroll();
          expect(spy.callCount).to.be(2);

          // first call should read the scrollLeft from the $container
          var firstCall = spy.getCall(0);
          expect(firstCall.thisValue.is($from)).to.be(true);
          expect(firstCall.args).to.eql([]);

          // second call should be setting the scrollLeft on the $scroller
          var secondCall = spy.getCall(1);
          expect(secondCall.thisValue.is($to)).to.be(true);
          expect(secondCall.args).to.eql([firstCall.returnValue]);
        });

        /**
         * In practice, calling $el.scrollLeft() causes the "scroll" event to trigger,
         * but the browser seems to be very careful about triggering the event too much
         * and I can't reliably recreate the browsers behavior in a test. So... faking it!
         */
        it('prevents tug of war by ignoring echo scroll events', function () {
          $from.scroll();
          expect(spy.callCount).to.be(2);

          spy.reset();
          $to.scroll();
          expect(spy.callCount).to.be(0);
        });
      });
    });
  });
});
