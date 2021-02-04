/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { DataPublicPluginStart } from '../shared_imports';
import { EsRuntimeField } from '../types';

const parseEsError = (error: Record<string, any>): Record<string, any> => {
  if (error === undefined) {
    return {};
  }
  return {};
};

/**
 * Handler to validate the painless script for syntax and semantic errors.
 * This is a temporary solution. In a future work we will have a dedicate
 * ES API to debug the script.
 */
export const getRuntimeFieldValidator = (
  index: string,
  searchService: DataPublicPluginStart['search']
) => async (runtimeField: EsRuntimeField) => {
  return await searchService
    .search({
      params: {
        index,
        body: {
          runtime_mappings: {
            temp: runtimeField,
          },
          size: 0,
          query: {
            match_none: {},
          },
        },
      },
    })
    .toPromise()
    .then(() => null)
    .catch((e) => parseEsError(e.attributes));
};
