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

import { mockCoreContext } from '../core_context.mock';
import { savedObjectsServiceMock } from '../mocks';
import { typeRegistryMock } from '../saved_objects/saved_objects_type_registry.mock';
import { CoreTelemetryService, CoreTelemetryClient } from '.';
import { CORE_TELEMETRY_TYPE } from './constants';
import { CoreTelemetryMappings } from './mappings';

describe('CoreTelemetryService', () => {
  const coreContext = mockCoreContext.create();

  describe('#setup', () => {
    const setup = () => {
      const savedObjectsStartPromise = Promise.resolve(
        savedObjectsServiceMock.createStartContract()
      );
      const coreTelemetry = new CoreTelemetryService(coreContext).setup({
        savedObjectsStartPromise,
      });
      return { savedObjectsStartPromise, coreTelemetry };
    };

    it('creates internal repository', async () => {
      const { savedObjectsStartPromise } = setup();

      const savedObjects = await savedObjectsStartPromise;
      expect(savedObjects.createInternalRepository).toHaveBeenCalledTimes(1);
      expect(savedObjects.createInternalRepository).toHaveBeenCalledWith([CORE_TELEMETRY_TYPE]);
    });

    describe('#registerTypeMappings', () => {
      it('registers core telemetry type', async () => {
        const { coreTelemetry } = setup();
        const typeRegistry = typeRegistryMock.create();

        coreTelemetry.registerTypeMappings(typeRegistry);
        expect(typeRegistry.registerType).toHaveBeenCalledTimes(1);
        expect(typeRegistry.registerType).toHaveBeenCalledWith({
          name: CORE_TELEMETRY_TYPE,
          hidden: true,
          namespaceType: 'agnostic',
          mappings: CoreTelemetryMappings,
        });
      });
    });

    describe('#getClient', () => {
      it('returns client', async () => {
        const { coreTelemetry } = setup();

        const telemetryClient = await coreTelemetry.getClient();
        expect(telemetryClient).toBeInstanceOf(CoreTelemetryClient);
      });
    });
  });
});
