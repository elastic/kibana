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

import { showSaveModal } from '../../../../../saved_objects/public';
jest.mock('../../../../../saved_objects/public');

import { onSaveSearch } from './on_save_search';
import { indexPatternMock } from '../../../__mocks__/index_pattern';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { DiscoverServices } from '../../../build_services';
import { GetStateReturn } from '../../angular/discover_state';
import { i18nServiceMock } from '../../../../../../core/public/mocks';

test('onSaveSearch', async () => {
  const serviceMock = ({
    core: {
      i18n: i18nServiceMock.create(),
    },
  } as unknown) as DiscoverServices;
  const stateMock = ({} as unknown) as GetStateReturn;

  await onSaveSearch({
    indexPattern: indexPatternMock,
    navigateTo: jest.fn(),
    savedSearch: savedSearchMock,
    services: serviceMock,
    state: stateMock,
  });

  expect(showSaveModal).toHaveBeenCalled();
});
