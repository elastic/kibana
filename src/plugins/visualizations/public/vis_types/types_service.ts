/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { visTypeAliasRegistry, VisTypeAlias } from './vis_type_alias_registry';
import { BaseVisType } from './base_vis_type';
import { VisTypeDefinition } from './types';
import { VisGroups } from './vis_groups_enum';

/**
 * Vis Types Service
 *
 * @internal
 */
export class TypesService {
  private types: Record<string, BaseVisType<any>> = {};
  private unregisteredHiddenTypes: string[] = [];

  private registerVisualization<TVisParam>(visDefinition: BaseVisType<TVisParam>) {
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
      createBaseVisualization: <TVisParams>(config: VisTypeDefinition<TVisParams>): void => {
        const vis = new BaseVisType(config);
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
      get: <TVisParams>(visualization: string): BaseVisType<TVisParams> | undefined => {
        return this.types[visualization];
      },
      /**
       * returns all registered visualization types
       */
      all: (): BaseVisType[] => {
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
export type { VisTypeAlias };
