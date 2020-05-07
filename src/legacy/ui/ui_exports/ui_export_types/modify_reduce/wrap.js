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

/**
 *  Wrap a function with any number of wrappers. Wrappers
 *  are functions that take a reducer and return a reducer
 *  that should be called in its place. The wrappers will
 *  be called in reverse order for setup and then in the
 *  order they are defined when the resulting reducer is
 *  executed.
 *
 *  const reducer = wrap(
 *    next => (acc) => acc[1] = 'a',
 *    next => (acc) => acc[1] = 'b',
 *    next => (acc) => acc[1] = 'c'
 *  )
 *
 *  reducer('foo') //=> 'fco'
 *
 *  @param  {Function} ...wrappers
 *  @param  {Function} reducer
 *  @return {Function}
 */
export function wrap(...args) {
  const reducer = args[args.length - 1];
  const wrappers = args.slice(0, -1);

  return wrappers.reverse().reduce((acc, wrapper) => wrapper(acc), reducer);
}
