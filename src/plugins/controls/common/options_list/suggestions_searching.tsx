/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type OptionsListSearchTechnique = 'prefix' | 'wildcard' | 'exact';

// export const OPTIONS_LIST_DEFAULT_SEARCH_TECHNIQUE: OptionsListSearchTechnique = 'prefix';

export const getDefaultSearchTechnique = (type: string): OptionsListSearchTechnique => {
  return getCompatibleSearchTypes(type)[0];
};

export const getCompatibleSearchTypes = (type?: string): OptionsListSearchTechnique[] => {
  switch (type) {
    case 'string': {
      return ['prefix', 'wildcard', 'exact'];
    }
    case 'number': {
      return ['exact'];
    }
    case 'ip': {
      return ['prefix', 'exact'];
    }
    default: {
      return [];
    }
  }
};
