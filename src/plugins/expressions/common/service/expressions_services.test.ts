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

import { ExpressionsService } from './expressions_services';

describe('ExpressionsService', () => {
  test('can instantiate', () => {
    new ExpressionsService();
  });

  test('returns expected setup contract', () => {
    const expressions = new ExpressionsService();

    expect(expressions.setup()).toMatchObject({
      getFunctions: expect.any(Function),
      registerFunction: expect.any(Function),
      registerType: expect.any(Function),
      registerRenderer: expect.any(Function),
      run: expect.any(Function),
    });
  });

  test('returns expected start contract', () => {
    const expressions = new ExpressionsService();
    expressions.setup();

    expect(expressions.start()).toMatchObject({
      getFunctions: expect.any(Function),
      run: expect.any(Function),
    });
  });

  test('has pre-installed default functions', () => {
    const expressions = new ExpressionsService();

    expect(typeof expressions.setup().getFunctions().var_set).toBe('object');
  });
});
