/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import $ from 'jquery';

export function initFixedElementDirective(app) {
  app.directive('fixedElementRoot', function () {
    return {
      restrict: 'A',
      link: function ($elem) {
        let fixedAt;
        $(window).bind('scroll', function () {
          const fixed = $('[fixed-element]', $elem);
          const body = $('[fixed-element-body]', $elem);
          const top = fixed.offset().top;

          if ($(window).scrollTop() > top) {
            // This is a gross hack, but its better than it was. I guess
            fixedAt = $(window).scrollTop();
            fixed.addClass(fixed.attr('fixed-element'));
            body.addClass(fixed.attr('fixed-element-body'));
            body.css({ top: fixed.height() });
          }

          if ($(window).scrollTop() < fixedAt) {
            fixed.removeClass(fixed.attr('fixed-element'));
            body.removeClass(fixed.attr('fixed-element-body'));
            body.removeAttr('style');
          }
        });
      },
    };
  });
}
