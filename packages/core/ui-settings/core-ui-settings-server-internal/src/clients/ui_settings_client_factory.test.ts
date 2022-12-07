/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { UiSettingsClientFactory } from './ui_settings_client_factory';
import { UiSettingsGlobalClient } from './ui_settings_global_client';
import { UiSettingsClient } from './ui_settings_client';

describe('ui settings factory', () => {
  const logger = loggingSystemMock.create();
  const savedObjectsClient = savedObjectsClientMock.create();

  const createOptions = (type: 'config' | 'config-global') => {
    return {
      type,
      id: '123',
      buildNum: 1337,
      savedObjectsClient,
      log: logger.get(),
    };
  };

  it('instantiates the appropriate class', () => {
    let options = createOptions('config-global');
    expect(UiSettingsClientFactory.create(options)).toBeInstanceOf(UiSettingsGlobalClient);

    options = createOptions('config');
    expect(UiSettingsClientFactory.create(options)).toBeInstanceOf(UiSettingsClient);
  });

  it('throws an error if not a supported type', () => {
    const options = createOptions('config-global');
    expect(() => {
      // @ts-expect-error
      UiSettingsClientFactory.create({ ...options, type: 'unsupported' });
    }).toThrow();
  });
});
