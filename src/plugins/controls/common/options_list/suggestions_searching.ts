/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type OptionsListSearchTechnique = 'prefix' | 'wildcard' | 'exact';

export const getDefaultSearchTechnique = (type: string): OptionsListSearchTechnique | undefined => {
  const compatibleSearchTechniques = getCompatibleSearchTechniques(type);
  return compatibleSearchTechniques.length > 0 ? compatibleSearchTechniques[0] : undefined;
};

export const getCompatibleSearchTechniques = (type?: string): OptionsListSearchTechnique[] => {
  switch (type) {
    case 'string': {
      return ['prefix', 'wildcard', 'exact'];
    }
    case 'ip': {
      return ['prefix', 'exact'];
    }
    case 'number': {
      return ['exact'];
    }
    default: {
      return [];
    }
  }
};
