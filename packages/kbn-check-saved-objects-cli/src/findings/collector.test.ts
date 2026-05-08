/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FindingsCollector } from './collector';
import { RULE_IDS, SavedObjectsCheckError } from './types';

describe('FindingsCollector', () => {
  it('collects added findings in order', () => {
    const collector = new FindingsCollector();
    collector.add({
      ruleId: RULE_IDS.NEW_TYPE_LEGACY_MIGRATIONS,
      severity: 'error',
      typeName: 'foo',
      message: 'no legacy migrations',
    });
    collector.add({
      ruleId: RULE_IDS.MODEL_VERSION_MISSING_SCHEMAS,
      severity: 'warning',
      typeName: 'bar',
      message: 'missing schemas',
    });

    const findings = collector.getFindings();
    expect(findings).toHaveLength(2);
    expect(findings[0].ruleId).toBe(RULE_IDS.NEW_TYPE_LEGACY_MIGRATIONS);
    expect(findings[1].ruleId).toBe(RULE_IDS.MODEL_VERSION_MISSING_SCHEMAS);
  });

  it('extracts the finding payload from SavedObjectsCheckError', () => {
    const collector = new FindingsCollector();
    const err = new SavedObjectsCheckError({
      ruleId: RULE_IDS.EXISTING_TYPE_MUTATED_MODEL_VERSION,
      severity: 'error',
      typeName: 'baz',
      message: 'mutated mv',
      fixHint: 'add a new model version',
    });

    collector.ingestErrors([err]);

    const [finding] = collector.getFindings();
    expect(finding.ruleId).toBe(RULE_IDS.EXISTING_TYPE_MUTATED_MODEL_VERSION);
    expect(finding.typeName).toBe('baz');
    expect(finding.fixHint).toBe('add a new model version');
  });

  it('falls back to a generic finding for plain Error instances and strips leading status emojis', () => {
    const collector = new FindingsCollector();
    collector.ingestErrors([new Error('\u274c something blew up')]);

    const [finding] = collector.getFindings();
    expect(finding.ruleId).toBe(RULE_IDS.GENERIC);
    expect(finding.severity).toBe('error');
    expect(finding.message).toBe('something blew up');
    expect(finding.typeName).toBeUndefined();
  });

  it('handles non-Error throwables by stringifying them', () => {
    const collector = new FindingsCollector();
    collector.ingestErrors(['boom', { toString: () => 'kaboom' }]);

    const findings = collector.getFindings();
    expect(findings).toHaveLength(2);
    expect(findings[0].message).toBe('boom');
    expect(findings[1].message).toBe('kaboom');
  });
});
