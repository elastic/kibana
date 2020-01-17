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
import React from 'react';
import { GuideSection } from './guide_section';

// @ts-ignore
import publicSetupContract from '!!raw-loader!./../../../src/plugins/data/public/search/i_search_setup';
// @ts-ignore
import publicSearchStrategy from '!!raw-loader!./../../../src/plugins/data/public/search/i_search_strategy';
// @ts-ignore
import publicSearch from '!!raw-loader!./../../../src/plugins/data/public/search/i_search';
// @ts-ignore
import publicPlugin from '!!raw-loader!./../../../src/plugins/data/public/search/search_service';

// @ts-ignore
import serverSetupContract from '!!raw-loader!./../../../src/plugins/data/server/search/i_search_setup';
// @ts-ignore
import serverSearchStrategy from '!!raw-loader!./../../../src/plugins/data/server/search/i_search_strategy';
// @ts-ignore
import serverSearch from '!!raw-loader!./../../../src/plugins/data/server/search/i_search';
// @ts-ignore
import serverPlugin from '!!raw-loader!./../../../src/plugins/data/server/search/search_service';

export const SearchApiPage = () => (
  <GuideSection
    codeSections={[
      {
        title: 'Public',
        code: [
          {
            description: 'search_service.ts',
            snippet: publicPlugin,
          },
          {
            description: `i_search_setup.ts`,
            snippet: publicSetupContract,
          },
          {
            description: 'i_search',
            snippet: publicSearch,
          },
          {
            description: 'i_search_strategy',
            snippet: publicSearchStrategy,
          },
        ],
      },
      {
        title: 'Server',
        code: [
          {
            description: 'search_service.ts',
            snippet: serverPlugin,
          },
          {
            description: `i_search_setup.ts`,
            snippet: serverSetupContract,
          },
          {
            description: 'i_search',
            snippet: serverSearch,
          },
          {
            description: 'i_search_strategy',
            snippet: serverSearchStrategy,
          },
        ],
      },
    ]}
  />
);
