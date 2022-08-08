/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IndicesGetAliasResponse } from '@elastic/elasticsearch/lib/api/types';
import type { BaseMapping } from './mapping';

interface BaseAlias {
  getIndices(includeAliases: boolean, collaborator: BaseMapping): string[];
  loadAliases(aliases: IndicesGetAliasResponse, collaborator: BaseMapping): void;
  clearAliases(): void;
}

export class Alias implements BaseAlias {
  public perAliasIndexes: Record<string, string[]> = {};

  getIndices = (includeAliases: boolean, collaborator: BaseMapping): string[] => {
    const ret: string[] = [];
    const perIndexTypes = collaborator.perIndexTypes;
    Object.keys(perIndexTypes).forEach((index) => {
      // ignore .ds* indices in the suggested indices list.
      if (!index.startsWith('.ds')) {
        ret.push(index);
      }
    });

    if (typeof includeAliases === 'undefined' ? true : includeAliases) {
      Object.keys(this.perAliasIndexes).forEach((alias) => {
        ret.push(alias);
      });
    }
    return ret;
  };

  loadAliases = (aliases: IndicesGetAliasResponse, collaborator: BaseMapping) => {
    this.perAliasIndexes = {};
    const perIndexTypes = collaborator.perIndexTypes;

    Object.entries(aliases).forEach(([index, indexAliases]) => {
      // verify we have an index defined. useful when mapping loading is disabled
      perIndexTypes[index] = perIndexTypes[index] || {};
      Object.keys(indexAliases.aliases || {}).forEach((alias) => {
        if (alias === index) {
          return;
        } // alias which is identical to index means no index.
        let curAliases = this.perAliasIndexes[alias];
        if (!curAliases) {
          curAliases = [];
          this.perAliasIndexes[alias] = curAliases;
        }
        curAliases.push(index);
      });
    });
    const includeAliases = false;
    this.perAliasIndexes._all = this.getIndices(includeAliases, collaborator);
  };

  clearAliases = () => {
    this.perAliasIndexes = {};
  };
}
