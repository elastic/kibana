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

import { getContextUrl } from './get_context_url';
import { FilterManager } from '../../../../data/public/query/filter_manager';
const filterManager = ({
  getGlobalFilters: () => [],
  getAppFilters: () => [],
} as unknown) as FilterManager;

describe('Get context url', () => {
  test('returning a valid context url', async () => {
    const url = await getContextUrl('docId', 'ipId', ['test1', 'test2'], filterManager);
    expect(url).toMatchInlineSnapshot(
      `"#/context/ipId/docId?_g=(filters:!())&_a=(columns:!(test1,test2),filters:!())"`
    );
  });

  test('returning a valid context url when docId contains whitespace', async () => {
    const url = await getContextUrl('doc Id', 'ipId', ['test1', 'test2'], filterManager);
    expect(url).toMatchInlineSnapshot(
      `"#/context/ipId/doc%20Id?_g=(filters:!())&_a=(columns:!(test1,test2),filters:!())"`
    );
  });
});
