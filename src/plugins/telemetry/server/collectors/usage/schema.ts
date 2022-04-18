/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import { LicenseUsage, StaticTelemetryUsage } from './telemetry_usage_collector';

const licenseSchema: MakeSchemaFrom<LicenseUsage> = {
  uuid: { type: 'keyword' },
  type: { type: 'keyword' },
  issued_to: { type: 'text' },
  issuer: { type: 'text' },
  issue_date_in_millis: { type: 'long' },
  start_date_in_millis: { type: 'long' },
  expiry_date_in_millis: { type: 'long' },
  max_resource_units: { type: 'long' },
};

export const staticTelemetrySchema: MakeSchemaFrom<StaticTelemetryUsage> = {
  ece: {
    kb_uuid: { type: 'keyword' },
    es_uuid: { type: 'keyword' },
    account_id: { type: 'keyword' },
    license: licenseSchema,
  },
  ess: {
    kb_uuid: { type: 'keyword' },
    es_uuid: { type: 'keyword' },
    account_id: { type: 'keyword' },
    license: licenseSchema,
  },
  eck: {
    operator_uuid: { type: 'keyword' },
    operator_roles: { type: 'keyword' },
    custom_operator_namespace: { type: 'boolean' },
    distribution: { type: 'text' },
    build: {
      hash: { type: 'text' },
      date: { type: 'date' },
      version: { type: 'keyword' },
    },
  },
};
