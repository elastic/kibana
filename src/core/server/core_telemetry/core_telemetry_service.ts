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

import {
  Logger,
  SavedObjectsServiceStart,
  ISavedObjectTypeRegistry,
  SavedObjectTypeRegistry,
} from 'src/core/server';
import { CoreContext } from '../core_context';
import { CoreTelemetryClient } from './core_telemetry_client';
import { CORE_TELEMETRY_TYPE } from './constants';
import { CoreTelemetryMappings } from './mappings';

/** @internal */
export interface CoreTelemetryServiceSetup {
  registerTypeMappings(
    typeRegistry: ISavedObjectTypeRegistry & Pick<SavedObjectTypeRegistry, 'registerType'>
  ): void;
  getClient(): Promise<CoreTelemetryClient>;
}

interface SetupDeps {
  savedObjectsStartPromise: Promise<SavedObjectsServiceStart>;
}

/** @internal */
export class CoreTelemetryService {
  private logger: Logger;

  constructor(coreContext: CoreContext) {
    this.logger = coreContext.logger.get('core-telemetry-service');
  }

  setup({ savedObjectsStartPromise }: SetupDeps): CoreTelemetryServiceSetup {
    this.logger.debug('Setting up Core Telemetry service');

    const internalRepositoryPromise = savedObjectsStartPromise.then((savedObjects) =>
      savedObjects.createInternalRepository([CORE_TELEMETRY_TYPE])
    );

    const registerTypeMappings = (typeRegistry: SavedObjectTypeRegistry) => {
      typeRegistry.registerType({
        name: CORE_TELEMETRY_TYPE,
        hidden: true,
        namespaceType: 'agnostic',
        mappings: CoreTelemetryMappings,
      });
    };

    const getClient = async () => {
      const internalRepository = await internalRepositoryPromise;
      const debugLogger = (message: string) => this.logger.debug(message);

      return new CoreTelemetryClient(debugLogger, internalRepository);
    };

    return { registerTypeMappings, getClient };
  }
}
