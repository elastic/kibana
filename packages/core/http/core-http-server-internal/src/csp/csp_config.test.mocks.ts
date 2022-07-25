/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { cspConfig } from './config';

const origSchema = cspConfig.schema;

export const mockConfig = {
  create(defaultDisableUnsafeEval: boolean) {
    // @ts-expect-error: Property 'extends' does not exist on type??
    cspConfig.schema = cspConfig.schema.extends({
      disableUnsafeEval: schema.boolean({ defaultValue: defaultDisableUnsafeEval }),
    });
    return cspConfig;
  },
  reset() {
    cspConfig.schema = origSchema;
  },
};
