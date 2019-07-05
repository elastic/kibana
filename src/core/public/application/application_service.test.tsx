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

import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';
import { MockCapabilitiesService } from './application_service.test.mocks';
import { ApplicationService } from './application_service';

describe('#start()', () => {
  it('exposes available apps from capabilities', async () => {
    const service = new ApplicationService();
    const setup = service.setup();
    setup.registerApp({ id: 'app1' } as any);
    setup.registerLegacyApp({ id: 'app2' } as any);
    const injectedMetadata = injectedMetadataServiceMock.createStartContract();
    expect((await service.start({ injectedMetadata })).availableApps).toMatchInlineSnapshot(`
Array [
  Object {
    "id": "app1",
  },
  Object {
    "id": "app2",
  },
]
`);
  });

  it('passes registered applications to capabilities', async () => {
    const service = new ApplicationService();
    const setup = service.setup();
    setup.registerApp({ id: 'app1' } as any);
    const injectedMetadata = injectedMetadataServiceMock.createStartContract();
    await service.start({ injectedMetadata });
    expect(MockCapabilitiesService.start).toHaveBeenCalledWith({
      apps: [{ id: 'app1' }],
      injectedMetadata,
    });
  });

  it('passes registered legacy applications to capabilities', async () => {
    const service = new ApplicationService();
    const setup = service.setup();
    setup.registerLegacyApp({ id: 'legacyApp1' } as any);
    const injectedMetadata = injectedMetadataServiceMock.createStartContract();
    await service.start({ injectedMetadata });
    expect(MockCapabilitiesService.start).toHaveBeenCalledWith({
      apps: [{ id: 'legacyApp1' }],
      injectedMetadata,
    });
  });
});
