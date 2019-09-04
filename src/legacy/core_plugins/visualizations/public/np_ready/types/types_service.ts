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

interface SetupDependencies {
  Vis: any;
  VisFactoryProvider: any;
  VisTypesRegistryProvider: any;
}

/**
 * Vis Types Service
 *
 * @internal
 */
export class TypesService {
  public setup({ Vis, VisFactoryProvider, VisTypesRegistryProvider }: SetupDependencies) {
    return {
      Vis,
      VisFactoryProvider,
      registerVisualization: (registerFn: () => any) => {
        VisTypesRegistryProvider.register(registerFn);
      },
      visTypeAliasRegistry,
    };
  }

  public stop() {
    // nothing to do here yet
  }
}

/** @internal */
export type TypesSetup = ReturnType<TypesService['setup']>;

/** @public types */
export type VisTypeAlias = VisTypeAlias;

/** @public static code */
// TODO once items are moved from ui/vis into this service
