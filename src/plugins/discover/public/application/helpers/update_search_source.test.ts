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

import { updateSearchSource } from './update_search_source';
import { createSearchSourceMock } from '../../../../data/common/search/search_source/mocks';
import { indexPatternMock } from '../../__mocks__/index_pattern';
import { AppState } from '../angular/discover_state';
import { IUiSettingsClient } from 'kibana/public';
import { DiscoverServices } from '../../build_services';
import { dataPluginMock } from '../../../../data/public/mocks';
import { SAMPLE_SIZE_SETTING } from '../../../common';

describe('updateSearchSource', () => {
  test('updates a given search source', async () => {
    const searchSourceMock = createSearchSourceMock({});
    const sampleSize = 250;
    const result = updateSearchSource(searchSourceMock, {
      indexPattern: indexPatternMock,
      services: ({
        data: dataPluginMock.createStartContract(),
        uiSettings: ({
          get: (key: string) => {
            if (key === SAMPLE_SIZE_SETTING) {
              return sampleSize;
            }
            return false;
          },
        } as unknown) as IUiSettingsClient,
      } as unknown) as DiscoverServices,
      state: ({ sort: [] } as unknown) as AppState,
    });
    expect(result.getField('index')).toEqual(indexPatternMock);
    expect(result.getField('size')).toEqual(sampleSize);
  });
});
