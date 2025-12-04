/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 *
 * Source: /oas_docs/output/kibana.yaml, operations: rotateEncryptionKey
 *
 * To regenerate: node scripts/generate_workflow_kibana_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  rotate_encryption_key_request,
  rotate_encryption_key_response,
} from './schemas/kibana_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

import { FetcherConfigSchema } from '../../schema';

// export contract
export const ROTATE_ENCRYPTION_KEY_CONTRACT: InternalConnectorContract = {
  type: 'kibana.rotateEncryptionKey',
  summary: `Rotate a key for encrypted saved objects`,
  description: `Superuser role required.

If a saved object cannot be decrypted using the primary encryption key, then Kibana will attempt to decrypt it using the specified decryption-only keys. In most of the cases this overhead is negligible, but if you're dealing with a large number of saved objects and experiencing performance issues, you may want to rotate the encryption key.

This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.
`,
  methods: ['POST'],
  patterns: ['/api/encrypted_saved_objects/_rotate_key'],
  documentation:
    'https://www.elastic.co/docs/api/doc/kibana/operation/operation-rotateencryptionkey',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['batch_size', 'type'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(rotate_encryption_key_request, 'body'),
    ...getShapeAt(rotate_encryption_key_request, 'path'),
    ...getShapeAt(rotate_encryption_key_request, 'query'),
    fetcher: FetcherConfigSchema,
  }),
  outputSchema: rotate_encryption_key_response,
};
