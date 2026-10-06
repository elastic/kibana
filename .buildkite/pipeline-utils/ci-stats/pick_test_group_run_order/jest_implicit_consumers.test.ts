/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expandJestImplicitConsumers } from './jest_implicit_consumers';

describe('expandJestImplicitConsumers', () => {
  it('adds encrypted_saved_objects when an upstream plugin changes SO model versions', () => {
    const affected = new Set(['@kbn/alerting-plugin']);
    const changedFiles = [
      'x-pack/platform/plugins/shared/alerting/server/saved_objects/model_versions/rule_model_versions.ts',
    ];

    const expanded = expandJestImplicitConsumers(affected, changedFiles);

    expect(expanded.has('@kbn/encrypted-saved-objects-plugin')).toBe(true);
    expect(expanded.has('@kbn/alerting-plugin')).toBe(true);
  });

  it('adds encrypted_saved_objects when an upstream plugin changes SO registration', () => {
    const affected = new Set(['@kbn/fleet-plugin']);
    const changedFiles = ['x-pack/platform/plugins/shared/fleet/server/saved_objects/index.ts'];

    const expanded = expandJestImplicitConsumers(affected, changedFiles);

    expect(expanded.has('@kbn/encrypted-saved-objects-plugin')).toBe(true);
  });

  it('does not add encrypted_saved_objects for unrelated changes', () => {
    const affected = new Set(['@kbn/alerting-plugin']);
    const changedFiles = ['x-pack/platform/plugins/shared/alerting/server/routes/foo.ts'];

    const expanded = expandJestImplicitConsumers(affected, changedFiles);

    expect(expanded.has('@kbn/encrypted-saved-objects-plugin')).toBe(false);
  });
});
