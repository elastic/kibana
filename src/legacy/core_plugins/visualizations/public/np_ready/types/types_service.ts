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

import { visTypeAliasRegistry, VisTypeAlias } from './vis_type_alias_registry';

export interface VisTypeDefinition {
  name: string;
}
/**
 * Vis Types Service
 *
 * @internal
 */
export class TypesService {
  private types: Record<string, VisTypeDefinition> = {};
  public setup() {
    return {
      registerVisualization: (registerFn: () => VisTypeDefinition) => {
        const visDefinition = registerFn();
        if (this.types[visDefinition.name]) {
          throw new Error('type already exists!');
        }
        this.types[visDefinition.name] = visDefinition;
      },
      registerAlias: visTypeAliasRegistry.add,
    };
  }

  public start() {
    return {
      get: (visualization: string) => {
        return this.types[visualization];
      },
      all: () => {
        return { ...this.types };
      },
      getAliases: visTypeAliasRegistry.get,
    };
  }

  public stop() {
    // nothing to do here yet
  }
}

/** @internal */
export type TypesSetup = ReturnType<TypesService['setup']>;
export type TypesStart = ReturnType<TypesService['start']>;

/** @public types */
export type VisTypeAlias = VisTypeAlias;

/** @public static code */
// TODO once items are moved from ui/vis into this service
