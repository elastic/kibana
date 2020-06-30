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

/* eslint-disable @kbn/eslint/no-restricted-paths */

import angular from 'angular';
import expect from '@kbn/expect';
import ngMock from 'ng_mock';
import $ from 'jquery';
import sinon from 'sinon';

import { PrivateProvider } from '../../../../../../plugins/kibana_legacy/public';
import { FixedScrollProvider } from '../../../../../../plugins/discover/public/application/angular/directives/fixed_scroll';
import { DebounceProviderTimeout } from '../../../../../../plugins/discover/public/application/angular/directives/debounce/debounce';

const testModuleName = 'fixedScroll';

angular
  .module(testModuleName, [])
  .provider('Private', PrivateProvider)
  .service('debounce', ['$timeout', DebounceProviderTimeout])
  .directive('fixedScroll', FixedScrollProvider);

describe('FixedScroll directive', function () {
  const sandbox = sinon.createSandbox();

  let compile;
  let flushPendingTasks;
  const trash = [];
  beforeEach(ngMock.module(testModuleName));
  beforeEach(
    ngMock.inject(function ($compile, $rootScope, $timeout) {
      flushPendingTasks = function flushPendingTasks() {
        $rootScope.$digest();
        $timeout.flush();
      };

      compile = function (ratioY, ratioX) {
        if (ratioX == null) ratioX = ratioY;

        // since the directive works at the sibling level we create a
        // parent for everything to happen in
        const $parent = $('<div>').css({
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        });

        $parent.appendTo(document.body);
        trash.push($parent);

        const $el = $('<div fixed-scroll></div>')
          .css({
            'overflow-x': 'auto',
            width: $parent.width(),
          })
          .appendTo($parent);

        const $content = $('<div>')
          .css({
            width: $parent.width() * ratioX,
            height: $parent.height() * ratioY,
          })
          .appendTo($el);

        $compile($parent)($rootScope);
        flushPendingTasks();

        return {
          $container: $el,
          $content: $content,
          $scroller: $parent.find('.fixed-scroll-scroller'),
        };
      };
    })
  );

  afterEach(function () {
    trash.splice(0).forEach(function ($el) {
      $el.remove();
    });

    sandbox.restore();
  });

  it('does nothing when not needed', function () {
    let els = compile(0.5, 1.5);
    expect(els.$scroller).to.have.length(0);

    els = compile(1.5, 0.5);
    expect(els.$scroller).to.have.length(0);
  });

  it('attaches a scroller below the element when the content is larger then the container', function () {
    const els = compile(1.5);
    expect(els.$scroller).to.have.length(1);
  });

  it('copies the width of the container', function () {
    const els = compile(1.5);
    expect(els.$scroller.width()).to.be(els.$container.width());
  });

  it('mimics the scrollWidth of the element', function () {
    const els = compile(1.5);
    expect(els.$scroller.prop('scrollWidth')).to.be(els.$container.prop('scrollWidth'));
  });

  describe('scroll event handling / tug of war prevention', function () {
    it('listens when needed, unlistens when not needed', function () {
      const on = sandbox.spy($.fn, 'on');
      const off = sandbox.spy($.fn, 'off');

      const els = compile(1.5);
      expect(on.callCount).to.be(2);
      checkThisVals('$.fn.on', on);

      expect(off.callCount).to.be(0);
      els.$container.width(els.$container.prop('scrollWidth'));
      flushPendingTasks();
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
      { from: '$scroller', to: '$container' },
    ].forEach(function (names) {
      describe('scroll events ' + JSON.stringify(names), function () {
        let spy;
        let els;
        let $from;
        let $to;

        beforeEach(function () {
          spy = sandbox.spy($.fn, 'scrollLeft');
          els = compile(1.5);
          $from = els[names.from];
          $to = els[names.to];
        });

        it('transfers the scrollLeft', function () {
          expect(spy.callCount).to.be(0);
          $from.scroll();
          expect(spy.callCount).to.be(2);

          // first call should read the scrollLeft from the $container
          const firstCall = spy.getCall(0);
          expect(firstCall.thisValue.is($from)).to.be(true);
          expect(firstCall.args).to.eql([]);

          // second call should be setting the scrollLeft on the $scroller
          const secondCall = spy.getCall(1);
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

          spy.resetHistory();
          $to.scroll();
          expect(spy.callCount).to.be(0);
        });
      });
    });
  });
});
