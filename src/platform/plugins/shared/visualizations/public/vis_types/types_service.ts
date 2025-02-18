/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { visTypeAliasRegistry, VisTypeAlias } from './vis_type_alias_registry';
import { BaseVisType } from './base_vis_type';
import { VisTypeDefinition } from './types';
import { VisGroups } from './vis_groups_enum';
import { VisParams } from '../../common';

/**
 * Vis Types Service
 *
 * @internal
 */
export class TypesService {
  private types: Record<string, BaseVisType<any>> = {};

  private registerVisualization<TVisParam extends VisParams>(
    visDefinition: BaseVisType<TVisParam>
  ) {
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
      createBaseVisualization: <TVisParams extends VisParams>(
        config: VisTypeDefinition<TVisParams>
      ): void => {
        const vis = new BaseVisType(config);
        this.registerVisualization(vis);
      },
      /**
       * registers a visualization alias
       * alias is a visualization type without implementation, it just redirects somewhere in kibana
       * @param {VisTypeAlias} config - visualization alias definition
       */
      registerAlias: visTypeAliasRegistry.add,
    };
  }

  public start() {
    return {
      /**
       * returns specific visualization or undefined if not found
       * @param {string} visualization - id of visualization to return
       */
      get: <TVisParams extends VisParams>(
        visualization: string
      ): BaseVisType<TVisParams> | undefined => {
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
