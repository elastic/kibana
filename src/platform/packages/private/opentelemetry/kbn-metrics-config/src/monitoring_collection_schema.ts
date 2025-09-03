/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type TypeOf, schema } from '@kbn/config-schema';

/**
 * Configuration of the plugin `monitoring_collection`
 */
export type MonitoringCollectionConfig = TypeOf<typeof monitoringCollectionSchema>;

/**
 * Config schema of the plugin `monitoring_collection`.
 * @privateRemarks It needs to be defined here because it declares the configuration of some Metric Exporters,
 * and importing the config from the plugin would create a circular dependency.
 */
export const monitoringCollectionSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  opentelemetry: schema.object({
    metrics: schema.object({
      otlp: schema.object({
        url: schema.maybe(schema.string()),
        headers: schema.maybe(schema.recordOf(schema.string(), schema.string())),
        exportIntervalMillis: schema.number({ defaultValue: 10000 }),
        logLevel: schema.string({ defaultValue: 'info' }),
      }),
      prometheus: schema.object({
        enabled: schema.boolean({ defaultValue: false }),
      }),
    }),
  }),
});
