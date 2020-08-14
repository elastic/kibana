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

import { cloneDeepWith } from 'lodash';

// We should add `any` return type to overcome bug in lodash types, customizer
// in lodash 3.* can return `undefined` if cloning is handled by the lodash, but
// type of the customizer function doesn't expect that.
function cloneBuffersCustomizer(val: unknown): any {
  if (Buffer.isBuffer(val)) {
    return Buffer.from(val);
  }
}

export function deepCloneWithBuffers<T>(val: T): T {
  return cloneDeepWith(val, cloneBuffersCustomizer);
}
