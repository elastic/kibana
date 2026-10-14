/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const aiValueReportServerArgs = [
  // Register the dev-only Attack Discovery data generator route + rule type used to
  // seed realistic data for the AI Value Report. Gated by `enableDataGeneratorRoutes`
  // in x-pack/solutions/security/plugins/elastic_assistant/server/plugin.ts, which
  // requires either --dev (local source runs) or this staff-owned cloud flag (CI
  // build-based runs).
  '--xpack.cloud.is_elastic_staff_owned=true',
];
