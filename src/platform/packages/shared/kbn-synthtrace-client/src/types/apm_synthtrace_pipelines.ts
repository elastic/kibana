/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum ApmSynthtracePipelineSchema {
  Default = 'default', // classic APM
  Otel = 'otel', // OTel native through APM server
  ApmToOtel = 'apmToOtel', // convert classic APM synthtrace scenario into OTel native (useful to run existing scenarios as OTel)
}
export type ApmSynthtracePipelines =
  | ApmSynthtracePipelineSchema.Default
  | ApmSynthtracePipelineSchema.Otel
  | ApmSynthtracePipelineSchema.ApmToOtel;
