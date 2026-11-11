/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Fixture file for audit.test.ts: shares its class name with fake_plugin_b but
// has different members, so the duplicate check must not report it.
export class OverviewTab {
  async openHostDetails() {}
  async readCpuChart() {}
}
