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

import sinon, { SinonSpy } from 'sinon';
import expect from '@kbn/expect';
import angular, { ITimeoutService, ICompileService, IRootScopeService } from 'angular';
import 'angular-mocks';
import 'angular-sanitize';
import 'angular-route';

import { coreMock } from '../../../../../../core/public/mocks';
import { initializeInnerAngularModule } from '../../../get_inner_angular';
import { navigationPluginMock } from '../../../../../navigation/public/mocks';
import { dataPluginMock } from '../../../../../data/public/mocks';
import { initAngularBootstrap } from '../../../../../kibana_legacy/public';

describe.skip('FixedScroll directive', function() {
  const sandbox = sinon.createSandbox();

  let compile: (
    ratioY: number,
    ratioX?: number
  ) => {
    $container: JQuery<HTMLElement>;
    $content: JQuery<HTMLElement>;
    $scroller: JQuery<HTMLElement>;
    [key: string]: JQuery<HTMLElement>;
  };
  let flushPendingTasks: () => void;
  const trash: Array<JQuery<HTMLElement>> = [];

  beforeEach(() => {
    initAngularBootstrap();
    initializeInnerAngularModule(
      'app/discover',
      coreMock.createStart(),
      navigationPluginMock.createStartContract(),
      dataPluginMock.createStartContract()
    );

    angular.mock.module('app/discover');
    angular.mock.inject(
      ($compile: ICompileService, _$timeout_: ITimeoutService, $rootScope: IRootScopeService) => {
        flushPendingTasks = () => {
          $rootScope.$digest();
          _$timeout_.flush();
        };

        compile = function(ratioY, ratioX = ratioY) {
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
              width: $parent.width()!,
            })
            .appendTo($parent);

          const $content = $('<div>')
            .css({
              width: $parent.width()! * ratioX,
              height: $parent.height()! * ratioY,
            })
            .appendTo($el);

          $compile($parent)($rootScope);
          flushPendingTasks();

          return {
            $container: $el,
            $content,
            $scroller: $parent.find('.fixed-scroll-scroller'),
          };
        };
      }
    );
  });

  afterEach(() => {
    trash.splice(0).forEach(function($el) {
      $el.remove();
    });

    sandbox.restore();
  });

  it('does nothing when not needed', function() {
    let els = compile(0.5, 1.5);
    expect(els.$scroller).to.have.length(0);

    els = compile(1.5, 0.5);
    expect(els.$scroller).to.have.length(0);
  });

  it('attaches a scroller below the element when the content is larger then the container', function() {
    const els = compile(1.5);
    expect(els.$scroller).to.have.length(1);
  });

  it('copies the width of the container', function() {
    const els = compile(1.5);
    expect(els.$scroller.width()).to.be(els.$container.width());
  });

  it('mimics the scrollWidth of the element', function() {
    const els = compile(1.5);
    expect(els.$scroller.prop('scrollWidth')).to.be(els.$container.prop('scrollWidth'));
  });

  describe.skip('scroll event handling / tug of war prevention', function() {
    it('listens when needed, unlistens when not needed', function() {
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

      function checkThisVals(name: string, spy: SinonSpy<any, any>) {
        // the this values should be different
        expect(spy.thisValues[0].is(spy.thisValues[1])).to.be(false);
        // but they should be either $scroller or $container
        spy.thisValues.forEach(function($this) {
          if ($this.is(els.$scroller) || $this.is(els.$container)) return;
          // @ts-ignore
          expect.fail('expected ' + name + ' to be called with $scroller or $container');
        });
      }
    });

    [
      { from: '$container', to: '$scroller' },
      { from: '$scroller', to: '$container' },
    ].forEach(function(names) {
      describe('scroll events ' + JSON.stringify(names), function() {
        let spy: SinonSpy<any, any>;
        let els;
        let $from: JQuery<HTMLElement>;
        let $to: JQuery<HTMLElement>;

        beforeEach(function() {
          spy = sandbox.spy($.fn, 'scrollLeft');
          els = compile(1.5);
          $from = els[names.from];
          $to = els[names.to];
        });

        it('transfers the scrollLeft', function() {
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
        it('prevents tug of war by ignoring echo scroll events', function() {
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
