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

// eslint-disable-next-line @elastic/kibana-custom/no-default-export
export default function HitSortFnFactory() {
  /**
   * Creates a sort function that will resort hits based on the value
   * es used to sort them.
   *
   * background:
   * When a hit is sorted by elasticsearch, es will write the values that it used
   * to sort them into an array at the top level of the hit like so
   *
   * ```
   * hits: {
   *   total: x,
   *   hits: [
   *     {
   *       _id: i,
   *       _source: {},
   *       sort: [
   *         // all values used to sort, in the order of precedence
   *       ]
   *     }
   *   ]
   * };
   * ```
   *
   * @param  {[type]} field     [description]
   * @param  {[type]} direction [description]
   * @return {[type]}           [description]
   */
  return function createHitSortFn(direction) {
    const descending = (direction === 'desc');

    return function sortHits(hitA, hitB) {
      let bBelowa = null;

      const aSorts = hitA.sort || [];
      const bSorts = hitB.sort || [];

      // walk each sort value, and compare until one is different
      for (let i = 0; i < bSorts.length; i++) {
        const a = aSorts[i];
        const b = bSorts[i];

        if (a == null || b > a) {
          bBelowa = !descending;
          break;
        }

        if (b < a) {
          bBelowa = descending;
          break;
        }
      }

      if (bBelowa !== null) {
        return bBelowa ? -1 : 1;
      } else {
        return 0;
      }

    };
  };
}
