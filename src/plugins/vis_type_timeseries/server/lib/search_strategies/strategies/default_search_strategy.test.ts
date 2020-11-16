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
import { DefaultSearchStrategy } from './default_search_strategy';
import { ReqFacade } from './abstract_search_strategy';
import { VisPayload } from '../../../../common/types';

describe('DefaultSearchStrategy', () => {
  let defaultSearchStrategy: DefaultSearchStrategy;
  let req: ReqFacade<VisPayload>;

  beforeEach(() => {
    req = {} as ReqFacade<VisPayload>;
    defaultSearchStrategy = new DefaultSearchStrategy();
  });

  test('should init an DefaultSearchStrategy instance', () => {
    expect(defaultSearchStrategy.name).toBe('default');
    expect(defaultSearchStrategy.checkForViability).toBeDefined();
    expect(defaultSearchStrategy.search).toBeDefined();
    expect(defaultSearchStrategy.getFieldsForWildcard).toBeDefined();
  });

  test('should check a strategy for viability', async () => {
    const value = await defaultSearchStrategy.checkForViability(req);

    expect(value.isViable).toBe(true);
    expect(value.capabilities).toEqual({
      request: req,
      fieldsCapabilities: {},
    });
  });
});
