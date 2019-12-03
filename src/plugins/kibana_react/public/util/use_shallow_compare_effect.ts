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

import React, { useEffect, useRef } from 'react';

/**
 * Similar to https://github.com/kentcdodds/use-deep-compare-effect
 * but uses shallow compare instead of deep
 */
export function useShallowCompareEffect(
  callback: React.EffectCallback,
  deps: React.DependencyList
) {
  useEffect(callback, useShallowCompareMemoize(deps));
}
function useShallowCompareMemoize(deps: React.DependencyList) {
  const ref = useRef<React.DependencyList | undefined>(undefined);

  if (!ref.current || deps.some((dep, index) => !shallowEqual(dep, ref.current![index]))) {
    ref.current = deps;
  }

  return ref.current;
}
// https://github.com/facebook/fbjs/blob/master/packages/fbjs/src/core/shallowEqual.js
function shallowEqual(objA: any, objB: any): boolean {
  if (is(objA, objB)) {
    return true;
  }

  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Test for A's keys different from B.
  for (let i = 0; i < keysA.length; i++) {
    if (
      !Object.prototype.hasOwnProperty.call(objB, keysA[i]) ||
      !is(objA[keysA[i]], objB[keysA[i]])
    ) {
      return false;
    }
  }

  return true;
}

/**
 * IE11 does not support Object.is
 */
function is(x: any, y: any): boolean {
  if (x === y) {
    return x !== 0 || y !== 0 || 1 / x === 1 / y;
  } else {
    return x !== x && y !== y;
  }
}
