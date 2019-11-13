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

import { styleServiceMock, momentServiceMock } from './integrations_service.test.mocks';

import { IntegrationsService } from './integrations_service';
import { uiSettingsServiceMock } from '../ui_settings/ui_settings_service.mock';

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
