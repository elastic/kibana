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

import { BehaviorSubject } from 'rxjs';

jest.mock('!!raw-loader!./disable_animations.css', () => 'MOCK DISABLE ANIMATIONS CSS');

import { StylesService } from './styles_service';
import { uiSettingsServiceMock } from '../../ui_settings/ui_settings_service.mock';

describe('StylesService', () => {
  const flushPromises = () => new Promise(resolve => setTimeout(resolve, 100));
  const getDisableAnimationsTag = () => document.querySelector('style#disableAnimationsCss')!;

  afterEach(() => getDisableAnimationsTag().remove());

  test('sets initial disable animations style', async () => {
    const disableAnimations$ = new BehaviorSubject(false);

    const uiSettings = uiSettingsServiceMock.createSetupContract();
    uiSettings.get$.mockReturnValueOnce(disableAnimations$);

    new StylesService().start({ uiSettings });
    await flushPromises();

    const styleTag = getDisableAnimationsTag();
    expect(styleTag).toBeDefined();
    expect(styleTag.textContent).toEqual('');
  });

  test('updates disable animations style', async () => {
    const disableAnimations$ = new BehaviorSubject(false);

    const uiSettings = uiSettingsServiceMock.createSetupContract();
    uiSettings.get$.mockReturnValueOnce(disableAnimations$);

    new StylesService().start({ uiSettings });

    disableAnimations$.next(true);
    await flushPromises();
    expect(getDisableAnimationsTag().textContent).toEqual('MOCK DISABLE ANIMATIONS CSS');

    disableAnimations$.next(false);
    await flushPromises();
    expect(getDisableAnimationsTag().textContent).toEqual('');
  });
});
