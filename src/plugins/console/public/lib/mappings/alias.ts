/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IndicesGetAliasResponse } from '@elastic/elasticsearch/lib/api/types';
import { getAutocompleteInfo } from '../../services';

export class Alias {
  constructor(public perAliasIndexes: Record<string, string[]> = {}) {}

  get = (includeAliases: boolean): string[] => {
    const ret: string[] = [];
    const perIndexTypes = getAutocompleteInfo().mapping.perIndexTypes;
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

  load = (aliases: IndicesGetAliasResponse) => {
    this.perAliasIndexes = {};

    Object.entries(aliases).forEach(([index, omdexAliases]) => {
      Object.keys(omdexAliases.aliases || {}).forEach((alias) => {
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

    this.perAliasIndexes._all = this.get(false);
  };

  clear = () => {
    this.perAliasIndexes = {};
  };
}
