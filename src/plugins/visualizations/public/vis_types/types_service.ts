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
import { BaseVisType, BaseVisTypeOptions } from './base_vis_type';
import { ReactVisType, ReactVisTypeOptions } from './react_vis_type';
import { VisType, VisGroups } from './types';

/**
 * Vis Types Service
 *
 * @internal
 */
export class TypesService {
  private types: Record<string, VisType<any>> = {};
  private unregisteredHiddenTypes: string[] = [];

  private registerVisualization<TVisParam>(visDefinition: VisType<TVisParam>) {
    if (this.unregisteredHiddenTypes.includes(visDefinition.name)) {
      visDefinition.hidden = true;
    }

    if (this.types[visDefinition.name]) {
      throw new Error('type already exists!');
    }
    this.types[visDefinition.name] = visDefinition;
  }

  public setup() {
    return {
      /**
       * registers a visualization type
       * @param config - visualization type definition
       */
      createBaseVisualization: <TVisParams>(config: BaseVisTypeOptions<TVisParams>): void => {
        const vis = new BaseVisType(config);
        this.registerVisualization(vis);
      },
      /**
       * registers a visualization which uses react for rendering
       * @param config - visualization type definition
       */
      createReactVisualization: <TVisParams>(config: ReactVisTypeOptions<TVisParams>): void => {
        const vis = new ReactVisType(config);
        this.registerVisualization(vis);
      },
      /**
       * registers a visualization alias
       * alias is a visualization type without implementation, it just redirects somewhere in kibana
       * @param {VisTypeAlias} config - visualization alias definition
       */
      registerAlias: visTypeAliasRegistry.add,
      /**
       * allows to hide specific visualization types from create visualization dialog
       * @param {string[]} typeNames - list of type ids to hide
       */
      hideTypes: (typeNames: string[]): void => {
        typeNames.forEach((name: string) => {
          if (this.types[name]) {
            this.types[name].hidden = true;
          } else {
            this.unregisteredHiddenTypes.push(name);
          }
        });
      },
    };
  }

  public start() {
    return {
      /**
       * returns specific visualization or undefined if not found
       * @param {string} visualization - id of visualization to return
       */
      get: <TVisParams>(visualization: string): VisType<TVisParams> => {
        return this.types[visualization];
      },
      /**
       * returns all registered visualization types
       */
      all: (): VisType[] => {
        return [...Object.values(this.types)];
      },
      /**
       * returns all registered aliases
       */
      getAliases: visTypeAliasRegistry.get,
      /**
       * unregisters a visualization alias by its name
       * alias is a visualization type without implementation, it just redirects somewhere in kibana
       * @param {string} visTypeAliasName - visualization alias name
       */
      unRegisterAlias: visTypeAliasRegistry.remove,
      /**
       * returns all visualizations of specific group
       * @param {VisGroups} group - group type (aggbased | other | tools)
       */
      getByGroup: (group: VisGroups) => {
        return Object.values(this.types).filter((type) => {
          return type.group === group;
        });
      },
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
export { VisTypeAlias };

/** @public static code */
// TODO once items are moved from ui/vis into this service
