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

import expect from '@kbn/expect';
import $ from 'jquery';
import _ from 'lodash';
import sinon from 'sinon';
import { positionTooltip } from '../position_tooltip';

describe('Tooltip Positioning', function () {
  const sandbox = sinon.createSandbox();
  const positions = ['north', 'south', 'east', 'west'];
  const bounds = ['top', 'left', 'bottom', 'right', 'area'];
  let $window;
  let $chart;
  let $tooltip;
  let $sizer;

  function testEl(width, height, $children) {
    const $el = $('<div>');

    const size = {
      width: _.random(width[0], width[1]),
      height: _.random(height[0], height[1])
    };

    $el.css({
      width: size.width,
      height: size.height,
      visibility: 'hidden'
    })
      .appendTo('body');

    if ($children) {
      $el.append($children);
    }

    $el.testSize = size;

    return $el;
  }

  beforeEach(function () {
    $window = testEl([500, 1000], [600, 800],
      $chart = testEl([600, 750], [350, 550],
        $tooltip = testEl([50, 100], [35, 75])
      )
    );

    $sizer = $tooltip.clone().appendTo($window);
  });

  afterEach(function () {
    $window.remove();
    $window = $chart = $tooltip = $sizer = null;
    positionTooltip.removeClone();
    sandbox.restore();
  });

  function makeEvent(xPercent, yPercent) {
    xPercent = xPercent || 0.5;
    yPercent = yPercent || 0.5;

    const base = $chart.offset();

    return {
      clientX: base.left + ($chart.testSize.width * xPercent),
      clientY: base.top + ($chart.testSize.height * yPercent)
    };
  }

  describe('getTtSize()', function () {
    it('should measure the outer-size of the tooltip using an un-obstructed clone', function () {
      const w = sandbox.spy($.fn, 'outerWidth');
      const h = sandbox.spy($.fn, 'outerHeight');

      positionTooltip.getTtSize($tooltip.html(), $sizer);

      [w, h].forEach(function (spy) {
        expect(spy).to.have.property('callCount', 1);
        const matchHtml = w.thisValues.filter(function ($t) {
          return !$t.is($tooltip) && $t.html() === $tooltip.html();
        });
        expect(matchHtml).to.have.length(1);
      });
    });
  });

  describe('getBasePosition()', function () {
    it('calculates the offset values for the four positions', function () {
      const size = positionTooltip.getTtSize($tooltip.html(), $sizer);
      const pos = positionTooltip.getBasePosition(size, makeEvent());

      positions.forEach(function (p) {
        expect(pos).to.have.property(p);
      });

      expect(pos.north).to.be.lessThan(pos.south);
      expect(pos.east).to.be.greaterThan(pos.west);
    });
  });

  describe('getBounds()', function () {
    it('returns the offsets for the tlrb of the element', function () {
      const cbounds = positionTooltip.getBounds($chart);

      bounds.forEach(function (b) {
        expect(cbounds).to.have.property(b);
      });

      expect(cbounds.top).to.be.lessThan(cbounds.bottom);
      expect(cbounds.left).to.be.lessThan(cbounds.right);
    });
  });

  describe('getOverflow()', function () {
    it('determines how much the base placement overflows the containing bounds in each direction', function () {
      // size the tooltip very small so it won't collide with the edges
      $tooltip.css({ width: 15, height: 15 });
      $sizer.css({ width: 15, height: 15 });
      const size = positionTooltip.getTtSize($tooltip.html(), $sizer);
      expect(size).to.have.property('width', 15);
      expect(size).to.have.property('height', 15);

      // position the element based on a mouse that is in the middle of the chart
      const pos = positionTooltip.getBasePosition(size, makeEvent(0.5, 0.5));

      const overflow = positionTooltip.getOverflow(size, pos, [$chart, $window]);
      positions.forEach(function (p) {
        expect(overflow).to.have.property(p);

        // all positions should be less than 0 because the tooltip is so much smaller than the chart
        expect(overflow[p]).to.be.lessThan(0);
      });
    });

    it('identifies an overflow with a positive value in that direction', function () {
      const size = positionTooltip.getTtSize($tooltip.html(), $sizer);

      // position the element based on a mouse that is in the bottom right hand corner of the chart
      const pos = positionTooltip.getBasePosition(size, makeEvent(0.99, 0.99));
      const overflow = positionTooltip.getOverflow(size, pos, [$chart, $window]);

      positions.forEach(function (p) {
        expect(overflow).to.have.property(p);

        if (p === 'south' || p === 'east') {
          expect(overflow[p]).to.be.greaterThan(0);
        } else {
          expect(overflow[p]).to.be.lessThan(0);
        }
      });
    });

    it('identifies only right overflow when tooltip overflows both sides of inner container but outer contains tooltip', function () {
      // Size $tooltip larger than chart
      const largeWidth = $chart.width() + 10;
      $tooltip.css({ width: largeWidth });
      $sizer.css({ width: largeWidth });
      const size = positionTooltip.getTtSize($tooltip.html(), $sizer);
      expect(size).to.have.property('width', largeWidth);

      // $chart is flush with the $window on the left side
      expect(positionTooltip.getBounds($chart).left).to.be(0);

      // Size $window large enough for tooltip on right side
      $window.css({ width: $chart.width() * 3 });

      // Position click event in center of $chart so $tooltip overflows both sides of chart
      const pos = positionTooltip.getBasePosition(size, makeEvent(0.5, 0.5));

      const overflow = positionTooltip.getOverflow(size, pos, [$chart, $window]);

      // no overflow on left (east)
      expect(overflow.east).to.be.lessThan(0);
      // overflow on right (west)
      expect(overflow.west).to.be.greaterThan(0);
    });
  });

  describe('positionTooltip() integration', function () {
    it('returns nothing if the $chart or $tooltip are not passed in', function () {
      expect(positionTooltip() === void 0).to.be(true);
      expect(positionTooltip(null, null, null) === void 0).to.be(true);
      expect(positionTooltip(null, $(), $()) === void 0).to.be(true);
    });

    function check(xPercent, yPercent/*, prev, directions... */) {
      const directions = _.drop(arguments, 2);
      const event = makeEvent(xPercent, yPercent);
      const placement = positionTooltip({
        $window: $window,
        $chart: $chart,
        $sizer: $sizer,
        event: event,
        $el: $tooltip,
        prev: _.isObject(directions[0]) ? directions.shift() : null
      });

      expect(placement).to.have.property('top').and.property('left');

      directions.forEach(function (dir) {
        switch (dir) {
          case 'top':
            expect(placement.top).to.be.lessThan(event.clientY);
            return;
          case 'bottom':
            expect(placement.top).to.be.greaterThan(event.clientY);
            return;
          case 'right':
            expect(placement.left).to.be.greaterThan(event.clientX);
            return;
          case 'left':
            expect(placement.left).to.be.lessThan(event.clientX);
            return;
        }
      });

      return placement;
    }

    describe('calculates placement of the tooltip properly', function () {
      it('mouse is in the middle', function () {
        check(0.50, 0.50, 'bottom', 'right');
      });

      it('mouse is in the top left', function () {
        check(0.10, 0.10, 'bottom', 'right');
      });

      it('mouse is in the top right', function () {
        check(0.99, 0.10, 'bottom', 'left');
      });

      it('mouse is in the bottom right', function () {
        check(0.99, 0.99, 'top', 'left');
      });

      it('mouse is in the bottom left', function () {
        check(0.10, 0.99, 'top', 'right');
      });
    });

    describe('maintain the direction of the tooltip on reposition', function () {
      it('mouse moves from the top right to the middle', function () {
        const pos = check(0.99, 0.10, 'bottom', 'left');
        check(0.50, 0.50, pos, 'bottom', 'left');
      });

      it('mouse moves from the bottom left to the middle', function () {
        const pos = check(0.10, 0.99, 'top', 'right');
        check(0.50, 0.50, pos, 'top', 'right');
      });
    });
  });
});
