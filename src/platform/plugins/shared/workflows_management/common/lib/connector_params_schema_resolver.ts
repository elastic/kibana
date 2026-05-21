/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorParamsSchemaResolver } from '@kbn/workflows-yaml';
import { getAllConnectors } from '../schema';

/**
 * Resolves the Zod params schema for a given step/connector type from the
 * plugin's connector catalog. Used to inject connector-aware enrichment into
 * the connector-agnostic validation utilities exported from
 * `@kbn/workflows-yaml`.
 */
export const connectorParamsSchemaResolver: ConnectorParamsSchemaResolver = (stepType) =>
  getAllConnectors().find((connector) => connector.type === stepType)?.paramsSchema ?? null;
