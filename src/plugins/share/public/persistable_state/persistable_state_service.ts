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

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { createPersistableStateContract } from './persistable_state_contract';
import { PersistableStateDefinition, PersistableStateContract } from './types';

export interface PersistableStateSetup {
  register: (definition: PersistableStateDefinition) => Promise<void>;
}

export interface PersistableStateStart {
  get: (definitionId: string) => Promise<PersistableStateContract<string>>;
}

export class PersistableStateService
  implements Plugin<PersistableStateSetup, PersistableStateStart> {
  private definitions: Map<string, PersistableStateContract<string>> = new Map();

  public setup(core: CoreSetup): PersistableStateSetup {
    return {
      register: async definition => {
        this.definitions.set(definition.id, createPersistableStateContract(definition));
      },
    };
  }

  public start(core: CoreStart): PersistableStateStart {
    return {
      get: async id => {
        const definition = this.definitions.get(id);

        if (!definition) {
          throw new Error(
            i18n.translate('share.persistableState.errors.noDefinitionWithId', {
              defaultMessage: 'No persistable state definition found with id "{id}"',
              values: { id },
            })
          );
        }

        return definition;
      },
    };
  }

  public stop() {}
}
