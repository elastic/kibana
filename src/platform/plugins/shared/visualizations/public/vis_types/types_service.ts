/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asyncMap } from '@kbn/std';
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
  private types: Record<string, () => Promise<BaseVisType<any>>> = {};

  private registerVisualization<TVisParams extends VisParams>(
    name: string,
    getVisDefinition: () => Promise<VisTypeDefinition<TVisParams>>
  ) {
    if (this.types[name]) {
      throw new Error('type already exists!');
    }
    this.types[name] = async () => {
      const config = await getVisDefinition();
      return new BaseVisType(config);
    };
  }

  private async getAll() {
    return await asyncMap(Object.values(this.types), async (getVisType) => {
      return getVisType()
    });
  }

  public setup() {
    return {
      /**
       * registers a visualization type
       * @param getVisDefinition - async visualization type definition loader
       */
      createBaseVisualization: <TVisParams extends VisParams>(
        name: string,
        getVisDefinition: () => Promise<VisTypeDefinition<TVisParams>>
      ): void => {
        this.registerVisualization(name, getVisDefinition);
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
      get: async <TVisParams extends VisParams>(
        visualization: string
      ): Promise<BaseVisType<TVisParams> | undefined> => {
        return await this.types[visualization]?.();
      },
      /**
       * returns all registered visualization types
       */
      all: this.getAll,
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
      getByGroup: async (group: VisGroups) => {
        return (await this.getAll()).filter((type) => {
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
