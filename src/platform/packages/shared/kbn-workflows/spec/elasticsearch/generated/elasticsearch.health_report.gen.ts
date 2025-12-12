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
 * Source: elasticsearch-specification repository, operations: health-report, health-report-1
 *
 * To regenerate: node scripts/generate_workflow_es_contracts.js
 */

import { z } from '@kbn/zod/v4';

import {
  health_report1_request,
  health_report1_response,
  health_report_request,
  health_report_response,
} from './schemas/es_openapi_zod.gen';
import { getShapeAt } from '../../../common/utils/zod';

// import all needed request and response schemas generated from the OpenAPI spec
import type { InternalConnectorContract } from '../../../types/latest';

// export contract
export const HEALTH_REPORT_CONTRACT: InternalConnectorContract = {
  type: 'elasticsearch.health_report',
  summary: `Get the cluster health`,
  description: `Get the cluster health.

Get a report with the health status of an Elasticsearch cluster.
The report contains a list of indicators that compose Elasticsearch functionality.

Each indicator has a health status of: green, unknown, yellow or red.
The indicator will provide an explanation and metadata describing the reason for its current health status.

The cluster’s status is controlled by the worst indicator status.

In the event that an indicator’s status is non-green, a list of impacts may be present in the indicator result which detail the functionalities that are negatively affected by the health issue.
Each impact carries with it a severity level, an area of the system that is affected, and a simple description of the impact on the system.

Some health indicators can determine the root cause of a health problem and prescribe a set of steps that can be performed in order to improve the health of the system.
The root cause and remediation steps are encapsulated in a diagnosis.
A diagnosis contains a cause detailing a root cause analysis, an action containing a brief description of the steps to take to fix the problem, the list of affected resources (if applicable), and a detailed step-by-step troubleshooting guide to fix the diagnosed problem.

NOTE: The health indicators perform root cause analysis of non-green health statuses. This can be computationally expensive when called frequently.
When setting up automated polling of the API for health status, set verbose to false to disable the more expensive analysis logic.

 Documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-health-report`,
  methods: ['GET'],
  patterns: ['_health_report', '_health_report/{feature}'],
  documentation:
    'https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-health-report',
  parameterTypes: {
    headerParams: [],
    pathParams: ['feature'],
    urlParams: ['timeout', 'verbose', 'size'],
    bodyParams: [],
  },
  paramsSchema: z.union([
    z.object({
      ...getShapeAt(health_report_request, 'body'),
      ...getShapeAt(health_report_request, 'path'),
      ...getShapeAt(health_report_request, 'query'),
    }),
    z.object({
      ...getShapeAt(health_report1_request, 'body'),
      ...getShapeAt(health_report1_request, 'path'),
      ...getShapeAt(health_report1_request, 'query'),
    }),
  ]),
  outputSchema: z.union([health_report_response, health_report1_response]),
};
