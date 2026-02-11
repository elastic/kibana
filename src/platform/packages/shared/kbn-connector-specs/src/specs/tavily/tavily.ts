/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';

export const Tavily: ConnectorSpec = {
  metadata: {
    id: '.tavily',
    displayName: 'Tavily',
    description: 'Search the web and extract content from web pages using Tavily',
    minimumLicense: 'enterprise',
    supportedFeatureIds: ['workflows'],
  },
  schema: z.object({}),
  actions: {},
  test: {
    handler: async () => ({ ok: true }),
  },
};
