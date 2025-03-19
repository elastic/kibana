/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { styleServiceMock, momentServiceMock } from './integrations_service.test.mocks';

import { IntegrationsService } from './integrations_service';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';

describe('IntegrationsService', () => {
  test('it wires up styles and moment', async () => {
    const uiSettings = uiSettingsServiceMock.createStartContract();
    const service = new IntegrationsService();

    await service.setup();
    expect(styleServiceMock.setup).toHaveBeenCalledWith();
    expect(momentServiceMock.setup).toHaveBeenCalledWith();

    await service.start({ uiSettings });
    expect(styleServiceMock.start).toHaveBeenCalledWith({ uiSettings });
    expect(momentServiceMock.start).toHaveBeenCalledWith({ uiSettings });

    await service.stop();
    expect(styleServiceMock.stop).toHaveBeenCalledWith();
    expect(momentServiceMock.stop).toHaveBeenCalledWith();
  });
});
