/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { postProcessOpenapiZodGen } from './post_process_openapi_zod_gen';

describe('postProcessOpenapiZodGen', () => {
  it('rewrites zod import only when isoDateTime is unused', () => {
    const input = `import { z } from 'zod/v4';\nexport const x = z.string();`;
    expect(postProcessOpenapiZodGen(input)).toBe(
      `import { z } from '@kbn/zod/v4';\nexport const x = z.string();`
    );
  });

  it('rewrites z.iso.datetime and adds isoDateTime import', () => {
    const input = `import { z } from 'zod/v4';\nexport const t = z.optional(z.iso.datetime());`;
    expect(postProcessOpenapiZodGen(input)).toBe(
      `import { z, isoDateTime } from '@kbn/zod/v4';\nexport const t = z.optional(isoDateTime());`
    );
  });
});
