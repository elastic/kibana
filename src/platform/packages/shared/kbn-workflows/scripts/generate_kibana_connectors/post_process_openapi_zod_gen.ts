/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Post-processes @hey-api/openapi-ts Zod output for Kibana workflow contracts. */
export const postProcessOpenapiZodGen = (source: string): string => {
  let result = source.replace(/import { z } from 'zod\/v4';/, "import { z } from '@kbn/zod/v4';");
  result = result.replace(/z\.iso\.datetime\(/g, 'isoDateTime(');

  if (result.includes('isoDateTime(')) {
    result = result.replace(
      "import { z } from '@kbn/zod/v4';",
      "import { z, isoDateTime } from '@kbn/zod/v4';"
    );
  }

  return result;
};
