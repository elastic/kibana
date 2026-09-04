/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Container, ContainerModule } from 'inversify';
import { injectionServiceMock } from '@kbn/core-di-mocks';
import {
  CoreStart,
  GlobalUiSettingsClient,
  SavedObjectsClient,
  UiSettingsClient,
} from '@kbn/core-di-server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { loadUiSettings } from './ui_settings';

describe('loadUiSettings', () => {
  let injection: jest.Mocked<ReturnType<typeof injectionServiceMock.createStartContract>>;
  let container: Container;
  let uiSettings: ReturnType<typeof uiSettingsServiceMock.createStartContract>;
  let savedObjectsClient: SavedObjectsClientContract;
  let uiSettingsClient: IUiSettingsClient;
  let globalUiSettingsClient: IUiSettingsClient;

  beforeEach(() => {
    jest.clearAllMocks();
    injection = injectionServiceMock.createStartContract();
    savedObjectsClient = savedObjectsClientMock.create();
    uiSettingsClient = uiSettingsServiceMock.createClient();
    globalUiSettingsClient = uiSettingsServiceMock.createClient();
    uiSettings = uiSettingsServiceMock.createStartContract();
    uiSettings.asScopedToClient.mockReturnValue(uiSettingsClient);
    uiSettings.globalAsScopedToClient.mockReturnValue(globalUiSettingsClient);
    container = injection.getContainer();
    container.load(new ContainerModule(loadUiSettings));
    container.bind(CoreStart('uiSettings')).toConstantValue(uiSettings);
    container.bind(SavedObjectsClient).toConstantValue(savedObjectsClient);
  });

  it('should resolve the uiSettings client built from the saved objects client', () => {
    expect(container.get(UiSettingsClient)).toBe(uiSettingsClient);
    expect(uiSettings.asScopedToClient).toHaveBeenCalledWith(savedObjectsClient);
  });

  it('should create the uiSettings client only once per scope', () => {
    const fork = injection.fork();

    expect(fork.get(UiSettingsClient)).toBe(uiSettingsClient);
    expect(fork.get(UiSettingsClient)).toBe(uiSettingsClient);
    expect(uiSettings.asScopedToClient).toHaveBeenCalledTimes(1);
  });

  it('should resolve the global uiSettings client built from the saved objects client', () => {
    expect(container.get(GlobalUiSettingsClient)).toBe(globalUiSettingsClient);
    expect(uiSettings.globalAsScopedToClient).toHaveBeenCalledWith(savedObjectsClient);
  });

  it('should create the global uiSettings client only once per scope', () => {
    const fork = injection.fork();

    expect(fork.get(GlobalUiSettingsClient)).toBe(globalUiSettingsClient);
    expect(fork.get(GlobalUiSettingsClient)).toBe(globalUiSettingsClient);
    expect(uiSettings.globalAsScopedToClient).toHaveBeenCalledTimes(1);
  });
});
