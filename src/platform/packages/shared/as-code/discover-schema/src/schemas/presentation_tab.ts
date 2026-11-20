/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { DiscoverTabType } from '@kbn/discover-session-constants';

export const discoverSessionApiPresentationTabTypeStateSchema = z
  .object({
    type: z.literal(`${DiscoverTabType.Presentation}`).meta({
      description:
        'A tab that renders a custom HTML presentation in Discover. Requires an ES|QL data source ' +
        'whose query activates the presentation experience (for example `ROW __discover_presentation = true`).',
    }),
  })
  .strict();
