/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RegisterDeprecationsConfig } from '../../deprecations';
import { getScriptingDisabledDeprecations } from './scripting_disabled_deprecation';

export const getElasticsearchDeprecationsProvider = (): RegisterDeprecationsConfig => {
  return {
    getDeprecations: async (context) => {
      return [...(await getScriptingDisabledDeprecations({ esClient: context.esClient }))];
    },
  };
};
