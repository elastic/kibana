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

import _ from 'lodash';
import $ from 'jquery';
import '../config';
import { uiModules } from '../modules';
import cssTmpl from './style_compile.css.tmpl';

const $style = $('<style>').appendTo('head').attr('id', 'style-compile');

uiModules
  .get('kibana')
  .run(function ($rootScope, config) {
    const truncateGradientHeight = 15;
    const template = _.template(cssTmpl);
    const locals = {};

    // watch the value of the truncate:maxHeight config param
    $rootScope.$watch(function () {
      return config.get('truncate:maxHeight');
    }, function (maxHeight) {
      if (maxHeight > 0) {
        locals.truncateMaxHeight = maxHeight + 'px !important';
        locals.truncateGradientTop = maxHeight - truncateGradientHeight + 'px';
      } else {
        locals.truncateMaxHeight = 'none';
        locals.truncateGradientTop = '-' + truncateGradientHeight + 'px';
      }

      $style.html(template(locals));
    });
  });
