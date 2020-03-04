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

module.exports = function(name, fn) {
  if (isSloppy(fn)) {
    // Hack to give the function the same name as the original
    return {
      [name]: function() {
        return fn.apply(this, arguments);
      },
    }[name];
  } else {
    // Hack to give the function the same name as the original
    return {
      [name]: function() {
        'use strict'; // eslint-disable-line strict
        return fn.apply(this, arguments);
      },
    }[name];
  }
};

function isSloppy(fn) {
  return Object.prototype.hasOwnProperty.call(fn, 'caller');
}
