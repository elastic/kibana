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
 * Source: elasticsearch-specification repository, operations: synonyms-put-synonym
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  synonyms_put_synonym_request,
  synonyms_put_synonym_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SYNONYMS_PUT_SYNONYM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.synonyms.put_synonym',
  summary: `Create or update a synonym set`,
  description: `Create or update a synonym set.

Synonyms sets are limited to a maximum of 10,000 synonym rules per set.
If you need to manage more synonym rules, you can create multiple synonym sets.

When an existing synonyms set is updated, the search analyzers that use the synonyms set are reloaded automatically for all indices.
This is equivalent to invoking the reload search analyzers API for all indices that use the synonyms set.

For practical examples of how to create or update a synonyms set, refer to the External documentation.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-put-synonym`,
  methods: ['PUT'],
  patterns: ['_synonyms/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-put-synonym',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: ['refresh'],
    bodyParams: ['synonyms_set'],
  },
  paramsSchema: z.object({
    ...getShapeAt(synonyms_put_synonym_request, 'body'),
    ...getShapeAt(synonyms_put_synonym_request, 'path'),
    ...getShapeAt(synonyms_put_synonym_request, 'query'),
  }),
  outputSchema: synonyms_put_synonym_response,
};
