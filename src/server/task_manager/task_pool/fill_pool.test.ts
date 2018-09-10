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
import sinon from 'sinon';
import { fillPool } from './fill_pool';

describe('fillPool', () => {
  test('stops filling when there are no more tasks in the store', async () => {
    const tasks = [[1, 2, 3], [4, 5]];
    let index = 0;
    const fetchAvailableTasks = async () => tasks[index++] || [];
    const run = sinon.spy(() => true);
    const converter = _.identity;

    await fillPool(run, fetchAvailableTasks, converter);

    expect(_.flattenDeep(run.args)).toEqual([1, 2, 3, 4, 5]);
  });

  test('stops filling when the pool has no more capacity', async () => {
    const tasks = [[1, 2, 3], [4, 5]];
    let index = 0;
    const fetchAvailableTasks = async () => tasks[index++] || [];
    const run = sinon.spy(() => false);
    const converter = _.identity;

    await fillPool(run, fetchAvailableTasks, converter);

    expect(_.flattenDeep(run.args)).toEqual([1, 2, 3]);
  });

  test('calls the converter on the records prior to running', async () => {
    const tasks = [[1, 2, 3], [4, 5]];
    let index = 0;
    const fetchAvailableTasks = async () => tasks[index++] || [];
    const run = sinon.spy(() => false);
    const converter = (x: number) => x.toString();

    await fillPool(run, fetchAvailableTasks, converter);

    expect(_.flattenDeep(run.args)).toEqual(['1', '2', '3']);
  });
});
