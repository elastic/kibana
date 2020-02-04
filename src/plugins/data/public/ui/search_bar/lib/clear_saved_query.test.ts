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

import { clearStateFromSavedQuery } from './clear_saved_query';

import { dataPluginMock } from '../../../mocks';
import { coreMock } from '../../../../../../core/public/mocks';
import { DataPublicPluginStart } from '../../../types';
import { Query } from '../../..';

describe('clearStateFromSavedQuery', () => {
  let dataMock: jest.Mocked<DataPublicPluginStart>;
  const core = coreMock.createStart();

  beforeEach(() => {
    dataMock = dataPluginMock.createStartContract();
  });

  it('should clear filters and query', async () => {
    const setQueryState = jest.fn();
    dataMock.query.filterManager.removeAll = jest.fn();
    clearStateFromSavedQuery(dataMock.query, setQueryState, core.uiSettings);
    expect(setQueryState).toHaveBeenCalled();
    expect(dataMock.query.filterManager.removeAll).toHaveBeenCalled();
  });

  it('should use search:queryLanguage', async () => {
    const LANGUAGE = 'banana';
    const setQueryState = jest.fn();
    dataMock.query.filterManager.removeAll = jest.fn();
    core.uiSettings.get.mockImplementation((key: string) => {
      return key === 'search:queryLanguage' ? LANGUAGE : undefined;
    });
    clearStateFromSavedQuery(dataMock.query, setQueryState, core.uiSettings);
    expect(setQueryState).toHaveBeenCalled();
    expect((setQueryState.mock.calls[0][0] as Query).language).toBe(LANGUAGE);
    expect(dataMock.query.filterManager.removeAll).toHaveBeenCalled();
  });
});
