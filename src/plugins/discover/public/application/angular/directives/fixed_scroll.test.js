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

import angular from 'angular';
import 'angular-mocks';
import $ from 'jquery';

import sinon from 'sinon';

import { initAngularBootstrap } from '../../../../../kibana_legacy/public';
import { FixedScrollProvider } from './fixed_scroll';

const testModuleName = 'fixedScroll';

angular.module(testModuleName, []).directive('fixedScroll', FixedScrollProvider);

describe('FixedScroll directive', function () {
  const sandbox = sinon.createSandbox();
  let mockWidth;
  let mockHeight;
  let currentWidth = 120;
  let currentHeight = 120;
  let currentJqLiteWidth = 120;
  let spyScrollWidth;

  let compile;
  let flushPendingTasks;
  const trash = [];

  beforeAll(() => {
    mockWidth = jest.spyOn($.prototype, 'width').mockImplementation(function (width) {
      if (width === undefined) {
        return currentWidth;
      } else {
        currentWidth = width;
        return this;
      }
    });
    mockHeight = jest.spyOn($.prototype, 'height').mockImplementation(function (height) {
      if (height === undefined) {
        return currentHeight;
      } else {
        currentHeight = height;
        return this;
      }
    });
    angular.element.prototype.width = jest.fn(function (width) {
      if (width === undefined) {
        return currentJqLiteWidth;
      } else {
        currentJqLiteWidth = width;
        return this;
      }
    });
    angular.element.prototype.offset = jest.fn(() => ({ top: 0 }));
  });

  beforeEach(() => {
    currentJqLiteWidth = 120;
    initAngularBootstrap();

    angular.mock.module(testModuleName);
    angular.mock.inject(($compile, $rootScope, $timeout) => {
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

        spyScrollWidth = jest.spyOn(window.HTMLElement.prototype, 'scrollWidth', 'get');
        spyScrollWidth.mockReturnValue($parent.width() * ratioX);
        angular.element.prototype.height = jest.fn(() => $parent.height() * ratioY);

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
          $scroller: $parent.find('.dscTableFixedScroll__scroller'),
        };
      };
    });
  });

  afterEach(function () {
    trash.splice(0).forEach(function ($el) {
      $el.remove();
    });

    sandbox.restore();
    spyScrollWidth.mockRestore();
  });

  afterAll(() => {
    mockWidth.mockRestore();
    mockHeight.mockRestore();
    delete angular.element.prototype.width;
    delete angular.element.prototype.height;
    delete angular.element.prototype.offset;
  });

  test('does nothing when not needed', function () {
    let els = compile(0.5, 1.5);
    expect(els.$scroller).toHaveLength(0);

    els = compile(1.5, 0.5);
    expect(els.$scroller).toHaveLength(0);
  });

  test('attaches a scroller below the element when the content is larger then the container', function () {
    const els = compile(1.5);
    expect(els.$scroller.length).toBe(1);
  });

  test('copies the width of the container', function () {
    const els = compile(1.5);
    expect(els.$scroller.width()).toBe(els.$container.width());
  });

  test('mimics the scrollWidth of the element', function () {
    const els = compile(1.5);
    expect(els.$scroller.prop('scrollWidth')).toBe(els.$container.prop('scrollWidth'));
  });

  describe('scroll event handling / tug of war prevention', function () {
    test('listens when needed, unlistens when not needed', function (done) {
      const on = sandbox.spy($.fn, 'on');
      const off = sandbox.spy($.fn, 'off');
      const jqLiteOn = sandbox.spy(angular.element.prototype, 'on');
      const jqLiteOff = sandbox.spy(angular.element.prototype, 'off');

      const els = compile(1.5);
      expect(on.callCount).toBe(1);
      expect(jqLiteOn.callCount).toBe(1);
      checkThisVals('$.fn.on', on, jqLiteOn);

      expect(off.callCount).toBe(0);
      expect(jqLiteOff.callCount).toBe(0);
      currentJqLiteWidth = els.$container.prop('scrollWidth');
      flushPendingTasks();
      expect(off.callCount).toBe(1);
      expect(jqLiteOff.callCount).toBe(1);
      checkThisVals('$.fn.off', off, jqLiteOff);
      done();

      function checkThisVals(namejQueryFn, spyjQueryFn, spyjqLiteFn) {
        // the this values should be different
        expect(spyjQueryFn.thisValues[0].is(spyjqLiteFn.thisValues[0])).toBeFalsy();
        // but they should be either $scroller or $container
        const el = spyjQueryFn.thisValues[0];

        if (el.is(els.$scroller) || el.is(els.$container)) return;

        done.fail('expected ' + namejQueryFn + ' to be called with $scroller or $container');
      }
    });

    // Turn off this row because tests failed.
    // Scroll event is not catched in fixed_scroll.
    // As container is jquery element in test but inside fixed_scroll it's a jqLite element.
    // it would need jquery in jest to make this work.
    [
      //{ from: '$container', to: '$scroller' },
      { from: '$scroller', to: '$container' },
    ].forEach(function (names) {
      describe('scroll events ' + JSON.stringify(names), function () {
        let spyJQueryScrollLeft;
        let spyJQLiteScrollLeft;
        let els;
        let $from;
        let $to;

        beforeEach(function () {
          spyJQueryScrollLeft = sandbox.spy($.fn, 'scrollLeft');
          spyJQLiteScrollLeft = sandbox.stub();
          angular.element.prototype.scrollLeft = spyJQLiteScrollLeft;
          els = compile(1.5);
          $from = els[names.from];
          $to = els[names.to];
        });

        afterAll(() => {
          delete angular.element.prototype.scrollLeft;
        });

        test('transfers the scrollLeft', function () {
          expect(spyJQueryScrollLeft.callCount).toBe(0);
          expect(spyJQLiteScrollLeft.callCount).toBe(0);
          $from.scroll();
          expect(spyJQueryScrollLeft.callCount).toBe(1);
          expect(spyJQLiteScrollLeft.callCount).toBe(1);

          // first call should read the scrollLeft from the $container
          const firstCall = spyJQueryScrollLeft.getCall(0);
          expect(firstCall.args).toEqual([]);

          // second call should be setting the scrollLeft on the $scroller
          const secondCall = spyJQLiteScrollLeft.getCall(0);
          expect(secondCall.args).toEqual([firstCall.returnValue]);
        });

        /**
         * In practice, calling $el.scrollLeft() causes the "scroll" event to trigger,
         * but the browser seems to be very careful about triggering the event too much
         * and I can't reliably recreate the browsers behavior in a test. So... faking it!
         */
        test('prevents tug of war by ignoring echo scroll events', function () {
          $from.scroll();
          expect(spyJQueryScrollLeft.callCount).toBe(1);
          expect(spyJQLiteScrollLeft.callCount).toBe(1);

          spyJQueryScrollLeft.resetHistory();
          spyJQLiteScrollLeft.resetHistory();
          $to.scroll();
          expect(spyJQueryScrollLeft.callCount).toBe(0);
          expect(spyJQLiteScrollLeft.callCount).toBe(0);
        });
      });
    });
  });
});
