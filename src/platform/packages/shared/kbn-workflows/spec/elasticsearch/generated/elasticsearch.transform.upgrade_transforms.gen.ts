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
 * Generated at: 2025-11-27T07:04:28.260Z
 * Source: elasticsearch-specification repository, operations: transform-upgrade-transforms
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  transform_upgrade_transforms_request,
  transform_upgrade_transforms_response,
} from './es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const TRANSFORM_UPGRADE_TRANSFORMS_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.transform.upgrade_transforms',
  connectorGroup: 'internal',
  summary: `Upgrade all transforms`,
  description: `Upgrade all transforms.

Transforms are compatible across minor versions and between supported major versions.
However, over time, the format of transform configuration information may change.
This API identifies transforms that have a legacy configuration format and upgrades them to the latest version.
It also cleans up the internal data structures that store the transform state and checkpoints.
The upgrade does not affect the source and destination indices.
The upgrade also does not affect the roles that transforms use when Elasticsearch security features are enabled; the role used to read source data and write to the destination index remains unchanged.

If a transform upgrade step fails, the upgrade stops and an error is returned about the underlying issue.
Resolve the issue then re-run the process again.
A summary is returned when the upgrade is finished.

To ensure continuous transforms remain running during a major version upgrade of the cluster – for example, from 7.16 to 8.0 – it is recommended to upgrade transforms before upgrading the cluster.
You may want to perform a recent cluster backup prior to the upgrade.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-upgrade-transforms`,
  methods: ['POST'],
  patterns: ['_transform/_upgrade'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-transform-upgrade-transforms',
  parameterTypes: {
    headerParams: [],
    pathParams: [],
    urlParams: ['dry_run', 'timeout'],
    bodyParams: [],
  },
  paramsSchema: z.object({
    ...getShapeAt(transform_upgrade_transforms_request, 'body'),
    ...getShapeAt(transform_upgrade_transforms_request, 'path'),
    ...getShapeAt(transform_upgrade_transforms_request, 'query'),
  }),
  outputSchema: transform_upgrade_transforms_response,
};
