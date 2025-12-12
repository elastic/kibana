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
 * Source: elasticsearch-specification repository, operations: synonyms-delete-synonym
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  synonyms_delete_synonym_request,
  synonyms_delete_synonym_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const SYNONYMS_DELETE_SYNONYM_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.synonyms.delete_synonym',
  summary: `Delete a synonym set`,
  description: `Delete a synonym set.

You can only delete a synonyms set that is not in use by any index analyzer.

Synonyms sets can be used in synonym graph token filters and synonym token filters.
These synonym filters can be used as part of search analyzers.

Analyzers need to be loaded when an index is restored (such as when a node starts, or the index becomes open).
Even if the analyzer is not used on any field mapping, it still needs to be loaded on the index recovery phase.

If any analyzers cannot be loaded, the index becomes unavailable and the cluster status becomes red or yellow as index shards are not available.
To prevent that, synonyms sets that are used in analyzers can't be deleted.
A delete request in this case will return a 400 response code.

To remove a synonyms set, you must first remove all indices that contain analyzers using it.
You can migrate an index by creating a new index that does not contain the token filter with the synonyms set, and use the reindex API in order to copy over the index data.
Once finished, you can delete the index.
When the synonyms set is not used in analyzers, you will be able to delete it.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-delete-synonym`,
  methods: ['DELETE'],
  patterns: ['_synonyms/{id}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-synonyms-delete-synonym',
  parameterTypes: {
    headerParams: [],
    pathParams: ['id'],
    urlParams: [],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(synonyms_delete_synonym_request, 'body'),
    ...getShapeAt(synonyms_delete_synonym_request, 'path'),
    ...getShapeAt(synonyms_delete_synonym_request, 'query'),
  }),
  outputSchema: synonyms_delete_synonym_response,
};
