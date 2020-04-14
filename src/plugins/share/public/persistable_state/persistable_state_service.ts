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
import { identity } from 'lodash';
import {
  PersistableStateDefinition,
  PersistableStateContract,
  ExtractReferences,
  MigrateState,
} from './types';

export interface PersistableStateSetup {
  register: (definition: PersistableStateDefinition) => Promise<void>;
}

export interface PersistableStateStart {
  get: (definitionId: string) => Promise<PersistableStateContract<string> | undefined>;
}

const defaultExtractReferences = ((state: any) => {
  return [state, []];
}) as ExtractReferences<string>;

export class PersistableStateService
  implements Plugin<PersistableStateSetup, PersistableStateStart> {
  private definitions: Map<string, PersistableStateContract<string>> = new Map();

  public setup(core: CoreSetup): PersistableStateSetup {
    return {
      register: async definition => {
        const { id, extractReferences, injectReferences, migrate } = definition;

        this.definitions.set(definition.id, {
          id,
          extractReferences: extractReferences || defaultExtractReferences,
          injectReferences: injectReferences || identity,
          migrate: migrate || (identity as MigrateState<string>),
        });
      },
    };
  }

  public start(core: CoreStart): PersistableStateStart {
    return {
      get: async id => this.definitions.get(id),
    };
  }

  public stop() {}
}
