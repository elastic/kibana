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

import { IconType } from '@elastic/eui';
import { visTypeAliasRegistry, VisTypeAlias } from './vis_type_alias_registry';
// @ts-ignore
import { BaseVisType } from './base_vis_type';
// @ts-ignore
import { ReactVisType } from './react_vis_type';
import { TriggerContextMapping } from '../../../ui_actions/public';

export interface VisType {
  name: string;
  title: string;
  description?: string;
  getSupportedTriggers?: () => Array<keyof TriggerContextMapping>;
  visualization: any;
  isAccessible?: boolean;
  requestHandler: string | unknown;
  responseHandler: string | unknown;
  icon?: IconType;
  image?: string;
  stage: 'experimental' | 'beta' | 'production';
  requiresSearch: boolean;
  hidden: boolean;

  // Since we haven't typed everything here yet, we basically "any" the rest
  // of that interface. This should be removed as soon as this type definition
  // has been completed. But that way we at least have typing for a couple of
  // properties on that type.
  [key: string]: any;
}

/**
 * Vis Types Service
 *
 * @internal
 */
export class TypesService {
  private types: Record<string, VisType> = {};
  private unregisteredHiddenTypes: string[] = [];

  public setup() {
    const registerVisualization = (registerFn: () => VisType) => {
      const visDefinition = registerFn();
      if (this.unregisteredHiddenTypes.includes(visDefinition.name)) {
        visDefinition.hidden = true;
      }

      if (this.types[visDefinition.name]) {
        throw new Error('type already exists!');
      }
      this.types[visDefinition.name] = visDefinition;
    };
    return {
      /**
       * registers a visualization type
       * @param {VisType} config - visualization type definition
       */
      createBaseVisualization: (config: any) => {
        const vis = new BaseVisType(config);
        registerVisualization(() => vis);
      },
      /**
       * registers a visualization which uses react for rendering
       * @param {VisType} config - visualization type definition
       */
      createReactVisualization: (config: any) => {
        const vis = new ReactVisType(config);
        registerVisualization(() => vis);
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
      hideTypes: (typeNames: string[]) => {
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
      get: (visualization: string) => {
        return this.types[visualization];
      },
      /**
       * returns all registered visualization types
       */
      all: () => {
        return [...Object.values(this.types)];
      },
      /**
       * returns all registered aliases
       */
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
export { VisTypeAlias };

/** @public static code */
// TODO once items are moved from ui/vis into this service
