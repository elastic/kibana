/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line max-classes-per-file
import { EmbeddableContentManagementDefinition } from '..';

type MaybeEmbeddableContentManagementDefinition = EmbeddableContentManagementDefinition | undefined;
type ResultSyncOrAsync<IsAsync, Result> = IsAsync extends true ? Promise<Result> : Result;
type DefinitionSyncOrAsync<IsAsync> = ResultSyncOrAsync<
  IsAsync,
  EmbeddableContentManagementDefinition
>;
type MaybeDefinitionSyncOrAsync<IsAsync> = ResultSyncOrAsync<
  IsAsync,
  MaybeEmbeddableContentManagementDefinition
>;

class EmbeddableContentManagementRegistry<IsAsync extends true | false = false> {
  private registry: Map<string, () => DefinitionSyncOrAsync<IsAsync>> = new Map();

  public registerContentManagementDefinition = (
    id: string,
    getDefinition: () => DefinitionSyncOrAsync<IsAsync>
  ) => {
    if (this.registry.has(id)) {
      throw new Error(`Content management definition for type "${id}" is already registered.`);
    }

    // if (!(definition.latestVersion in definition.versions)) {
    //   throw new Error(
    //     `Content management definition for type "${definition.id}" does not include the current version "${definition.latestVersion}".`
    //   );
    // }
    this.registry.set(id, getDefinition);
  };

  public getContentManagementDefinition(id: string): MaybeDefinitionSyncOrAsync<IsAsync> {
    const getDefinition = this.registry.get(id);
    if (!getDefinition) {
      return undefined as IsAsync extends true ? Promise<undefined> : undefined;
    }
    return getDefinition();
  }
}

export class EmbeddableContentManagementRegistryPublic extends EmbeddableContentManagementRegistry<true> {
  public async getContentManagementDefinition(
    id: string
  ): Promise<MaybeEmbeddableContentManagementDefinition> {
    return await super.getContentManagementDefinition(id);
  }
}

export class EmbeddableContentManagementRegistryServer extends EmbeddableContentManagementRegistry<false> {
  public getContentManagementDefinition(id: string): MaybeEmbeddableContentManagementDefinition {
    return super.getContentManagementDefinition(id);
  }
}
