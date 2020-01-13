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

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"), you may
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

// This mock is here for BWC, but will be left behind and replaced by
// the data service mock in the new platform.
import { ISearchSource } from '../index';

export const searchSourceMock: MockedKeys<ISearchSource> = {
  setPreferredSearchStrategyId: jest.fn(),
  setFields: jest.fn().mockReturnThis(),
  setField: jest.fn().mockReturnThis(),
  getId: jest.fn(),
  getFields: jest.fn(),
  getField: jest.fn(),
  getOwnField: jest.fn(),
  create: jest.fn().mockReturnThis(),
  createCopy: jest.fn().mockReturnThis(),
  createChild: jest.fn().mockReturnThis(),
  setParent: jest.fn(),
  getParent: jest.fn().mockReturnThis(),
  fetch: jest.fn().mockResolvedValue({}),
  onRequestStart: jest.fn(),
  getSearchRequestBody: jest.fn(),
  destroy: jest.fn(),
  history: [],
};
