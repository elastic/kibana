/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { momentMock } from './moment_service.test.mocks';

import { BehaviorSubject } from 'rxjs';
import { MomentService } from './moment_service';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';

describe('MomentService', () => {
  let service: MomentService;

  beforeEach(() => {
    momentMock.tz.setDefault.mockClear();
    momentMock.tz.guess.mockClear();
    momentMock.weekdays.mockClear();
    momentMock.updateLocale.mockClear();
    service = new MomentService();
  });

  afterEach(() => service.stop());

  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 100));

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

  it('sets timezone when a zone is defined', async () => {
    const tz$ = new BehaviorSubject('tz3');
    const uiSettings = uiSettingsServiceMock.createSetupContract();
    uiSettings.get$.mockReturnValueOnce(tz$);

    service.start({ uiSettings });
    await flushPromises();
    expect(momentMock.tz.setDefault).toHaveBeenCalledWith('tz3');
  });

  it('set timezone with result of moment.tz.guess for unknown zone', async () => {
    const tz$ = new BehaviorSubject('timezone/undefined');
    const uiSettings = uiSettingsServiceMock.createSetupContract();
    uiSettings.get$.mockReturnValueOnce(tz$);

    const guessedTz = { guessed: true };
    momentMock.tz.guess.mockReturnValue(guessedTz);

    service.start({ uiSettings });
    await flushPromises();

    expect(momentMock.tz.guess).toHaveBeenCalledTimes(1);
    expect(momentMock.tz.setDefault).toHaveBeenCalledTimes(1);
    expect(momentMock.tz.setDefault).toHaveBeenCalledWith(guessedTz);
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
