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

import { momentMock } from './moment_service.test.mocks';
import { MomentService } from './moment_service';
import { uiSettingsServiceMock } from '../../ui_settings/ui_settings_service.mock';
import { BehaviorSubject } from 'rxjs';

describe('MomentService', () => {
  let service: MomentService;
  beforeEach(() => {
    momentMock.tz.setDefault.mockClear();
    momentMock.weekdays.mockClear();
    momentMock.updateLocale.mockClear();
    service = new MomentService();
  });
  afterEach(() => service.stop());

  const flushPromises = () => new Promise(resolve => setTimeout(resolve, 100));

  test('sets initial moment config', async () => {
    const tz$ = new BehaviorSubject('tz1');
    const dow$ = new BehaviorSubject('dow1');

    const uiSettings = uiSettingsServiceMock.createSetupContract();
    uiSettings.get$.mockReturnValueOnce(tz$).mockReturnValueOnce(dow$);

    service.start({ uiSettings });
    await flushPromises();
    expect(momentMock.tz.setDefault).toHaveBeenCalledWith('tz1');
    expect(momentMock.updateLocale).toHaveBeenCalledWith('default-locale', { week: { dow: 0 } });
  });

  test('updates moment config', async () => {
    const tz$ = new BehaviorSubject('tz1');
    const dow$ = new BehaviorSubject('dow1');

    const uiSettings = uiSettingsServiceMock.createSetupContract();
    uiSettings.get$.mockReturnValueOnce(tz$).mockReturnValueOnce(dow$);

    service.start({ uiSettings });
    tz$.next('tz2');
    tz$.next('tz3');
    dow$.next('dow3');
    dow$.next('dow2');

    await flushPromises();
    expect(momentMock.tz.setDefault.mock.calls).toEqual([['tz1'], ['tz2'], ['tz3']]);
    expect(momentMock.updateLocale.mock.calls).toEqual([
      ['default-locale', { week: { dow: 0 } }],
      ['default-locale', { week: { dow: 2 } }],
      ['default-locale', { week: { dow: 1 } }],
    ]);
  });
});
