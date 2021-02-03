/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SpecDefinitionsService } from '../../../services';

export const aliases = (specService: SpecDefinitionsService) => {
  const aliasRules = {
    filter: {},
    routing: '1',
    search_routing: '1,2',
    index_routing: '1',
  };
  specService.addGlobalAutocompleteRules('aliases', {
    '*': aliasRules,
  });
};
