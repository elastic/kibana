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
import { notificationServiceMock } from '../../../../../core/public/mocks';
import { HistoryMock } from '../../services/history.mock';
import { SettingsMock } from '../../services/settings.mock';
import { StorageMock } from '../../services/storage.mock';

import { ContextValue } from './services_context';

export const serviceContextMock = {
  create: (): ContextValue => {
    const storage = new StorageMock({} as any, 'test');
    (storage.keys as jest.Mock).mockImplementation(() => []);
    return {
      elasticsearchUrl: 'test',
      services: {
        trackUiMetric: { count: () => {}, load: () => {} },
        storage,
        settings: new SettingsMock(storage),
        history: new HistoryMock(storage),
        notifications: notificationServiceMock.createSetupContract(),
        objectStorageClient: {} as any,
      },
      docLinkVersion: 'NA',
    };
  },
};
