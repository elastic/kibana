/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

jest.mock('./disable_animations.css?raw', () => 'MOCK DISABLE ANIMATIONS CSS');

import { StylesService } from './styles_service';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';

describe('StylesService', () => {
  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 100));
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
