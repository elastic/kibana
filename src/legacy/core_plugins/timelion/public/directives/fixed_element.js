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

const app = require('ui/modules').get('apps/timelion', []);
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
    }
  };
});
