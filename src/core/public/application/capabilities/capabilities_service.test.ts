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

import { InjectedMetadataService } from '../../injected_metadata';
import { CapabilitiesService } from './capabilities_service';

describe('#start', () => {
  const injectedMetadata = new InjectedMetadataService({
    injectedMetadata: {
      version: 'kibanaVersion',
      capabilities: {
        catalogue: {},
        management: {},
        navLinks: {
          app1: true,
          app2: false,
        },
        foo: { feature: true },
        bar: { feature: true },
      },
    } as any,
  }).start();
  const apps = [{ id: 'app1' }, { id: 'app2', capabilities: { app2: { feature: true } } }] as any;

  it('filters available apps based on returned navLinks', async () => {
    const service = new CapabilitiesService();
    expect((await service.start({ apps, injectedMetadata })).availableApps).toEqual([
      { id: 'app1' },
    ]);
  });

  it('does not allow Capabilities to be modified', async () => {
    const service = new CapabilitiesService();
    const { capabilities } = await service.start({
      apps,
      injectedMetadata,
    });

    // @ts-ignore TypeScript knows this shouldn't be possible
    expect(() => (capabilities.foo = 'foo')).toThrowError();
  });
});
