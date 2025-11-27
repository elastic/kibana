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
 * Generated at: 2025-11-27T07:43:24.872Z
 * Source: elasticsearch-specification repository, operations: ilm-migrate-to-data-tiers
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  ilm_migrate_to_data_tiers_request,
  ilm_migrate_to_data_tiers_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const ILM_MIGRATE_TO_DATA_TIERS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.ilm.migrate_to_data_tiers',
  connectorGroup: 'internal',
  summary: `Migrate to data tiers routing`,
  description: `Migrate to data tiers routing.

Switch the indices, ILM policies, and legacy, composable, and component templates from using custom node attributes and attribute-based allocation filters to using data tiers.
Optionally, delete one legacy index template.
Using node roles enables ILM to automatically move the indices between data tiers.

Migrating away from custom node attributes routing can be manually performed.
This API provides an automated way of performing three out of the four manual steps listed in the migration guide:

1. Stop setting the custom hot attribute on new indices.
1. Remove custom allocation settings from existing ILM policies.
1. Replace custom allocation settings from existing indices with the corresponding tier preference.

ILM must be stopped before performing the migration.
Use the stop ILM and get ILM status APIs to wait until the reported operation mode is \`STOPPED\`.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-migrate-to-data-tiers`,
  methods: ['POST'],
  patterns: ['_ilm/migrate_to_data_tiers'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-migrate-to-data-tiers',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['dry_run', 'master_timeout'],
    bodyParams: ['legacy_template_to_delete', 'node_attribute'],
  },
  paramsSchema: z.object({
    ...getShapeAt(ilm_migrate_to_data_tiers_request, 'body'),
    ...getShapeAt(ilm_migrate_to_data_tiers_request, 'path'),
    ...getShapeAt(ilm_migrate_to_data_tiers_request, 'query'),
  }),
  outputSchema: ilm_migrate_to_data_tiers_response,
};
