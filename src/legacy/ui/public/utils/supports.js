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

/**
 * just a place to put feature detection checks
 */
export const supports = {
  cssFilters: (function() {
    const e = document.createElement('img');
    const rules = ['webkitFilter', 'mozFilter', 'msFilter', 'filter'];
    const test = 'grayscale(1)';
    rules.forEach(function(rule) {
      e.style[rule] = test;
    });

    document.body.appendChild(e);
    const styles = window.getComputedStyle(e);
    const can = _(styles)
      .pick(rules)
      .includes(test);
    document.body.removeChild(e);

    return can;
  })(),
};
