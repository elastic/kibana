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

import $ from 'jquery';
import _ from 'lodash';
import { DebounceProvider } from './debounce';

const SCROLLER_HEIGHT = 20;

/**
 * This directive adds a fixed horizontal scrollbar to the bottom of the window that proxies its scroll events
 * to the target element's real scrollbar. This is useful when the target element's horizontal scrollbar
 * might be waaaay down the page, like the doc table on Discover.
 */
export function FixedScrollProvider(Private) {
  const debounce = Private(DebounceProvider);

  return {
    restrict: 'A',
    link: function ($scope, $el) {
      let $window = $(window);
      let $scroller = $('<div class="fixed-scroll-scroller">').height(SCROLLER_HEIGHT);

      /**
       * Remove the listeners bound in listen()
       * @type {function}
       */
      let unlisten = _.noop;

      /**
       * Listen for scroll events on the $scroller and the $el, sets unlisten()
       *
       * unlisten must be called before calling or listen() will throw an Error
       *
       * Since the browser emits "scroll" events after setting scrollLeft
       * the listeners also prevent tug-of-war
       *
       * @throws {Error} If unlisten was not called first
       * @return {undefined}
       */
      function listen() {
        if (unlisten !== _.noop) {
          throw new Error(
            'fixedScroll listeners were not cleaned up properly before re-listening!'
          );
        }

        let blockTo;
        function bind($from, $to) {
          function handler() {
            if (blockTo === $to) return (blockTo = null);
            $to.scrollLeft((blockTo = $from).scrollLeft());
          }

          $from.on('scroll', handler);
          return function () {
            $from.off('scroll', handler);
          };
        }

        unlisten = _.flow(bind($el, $scroller), bind($scroller, $el), function () {
          unlisten = _.noop;
        });
      }

      /**
       * Revert DOM changes and event listeners
       * @return {undefined}
       */
      function cleanUp() {
        unlisten();
        $scroller.detach();
        $el.css('padding-bottom', 0);
      }

      /**
       * Modify the DOM and attach event listeners based on need.
       * Is called many times to re-setup, must be idempotent
       * @return {undefined}
       */
      function setup() {
        cleanUp();

        const containerWidth = $el.width();
        const contentWidth = $el.prop('scrollWidth');
        const containerHorizOverflow = contentWidth - containerWidth;

        const elTop = $el.offset().top - $window.scrollTop();
        const elBottom = elTop + $el.height();
        const windowVertOverflow = elBottom - $window.height();

        const requireScroller = containerHorizOverflow > 0 && windowVertOverflow > 0;
        if (!requireScroller) return;

        // push the content away from the scroller
        $el.css('padding-bottom', SCROLLER_HEIGHT);

        // fill the scroller with a dummy element that mimics the content
        $scroller
          .width(containerWidth)
          .html($('<div>').css({ width: contentWidth, height: SCROLLER_HEIGHT }))
          .insertAfter($el);

        // listen for scroll events
        listen();
      }

      let width;
      let scrollWidth;
      function checkWidth() {
        const newScrollWidth = $el.prop('scrollWidth');
        const newWidth = $el.width();

        if (scrollWidth !== newScrollWidth || width !== newWidth) {
          $scope.$apply(setup);

          scrollWidth = newScrollWidth;
          width = newWidth;
        }
      }

      const debouncedCheckWidth = debounce(checkWidth, 100, {
        invokeApply: false,
      });
      $scope.$watch(debouncedCheckWidth);

      // cleanup when the scope is destroyed
      $scope.$on('$destroy', function () {
        cleanUp();
        debouncedCheckWidth.cancel();
        $scroller = $window = null;
      });
    },
  };
}
