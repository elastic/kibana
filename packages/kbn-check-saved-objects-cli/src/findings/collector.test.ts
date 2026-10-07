/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ListrTaskObject } from 'listr2';
import { ListrError, ListrErrorTypes } from 'listr2';
import { FindingsCollector } from './collector';
import { RULE_IDS } from './types';
import { SavedObjectsCheckError } from './error';
import type { TaskContext } from '../commands/types';

/**
 * Minimal stub satisfying the ListrError constructor at runtime.
 * The constructor reads `task.path` (always) and `task.options.collectErrors`
 * (to decide whether to clone ctx). A full Task instance is not constructable
 * in unit tests without a live Listr runner.
 */
const stubTask = { path: [], options: {} } as Partial<
  ListrTaskObject<TaskContext>
> as ListrTaskObject<TaskContext>;

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

  it('extracts the single-finding payload from SavedObjectsCheckError', () => {
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

  it('expands a multi-finding SavedObjectsCheckError into one entry per payload, preserving order', () => {
    const collector = new FindingsCollector();
    const err = new SavedObjectsCheckError([
      {
        ruleId: RULE_IDS.REMOVED_TYPE_NAME_REUSED,
        severity: 'error',
        typeName: 'foo',
        message: "Cannot re-register 'foo'",
      },
      {
        ruleId: RULE_IDS.REMOVED_TYPE_NAME_REUSED,
        severity: 'error',
        typeName: 'bar',
        message: "Cannot re-register 'bar'",
      },
    ]);

    collector.ingestErrors([err]);

    const findings = collector.getFindings();
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.typeName)).toEqual(['foo', 'bar']);
  });

  it('unwraps a Listr2 ListrError and extracts the nested SavedObjectsCheckError findings', () => {
    const collector = new FindingsCollector();
    const original = new SavedObjectsCheckError({
      ruleId: RULE_IDS.EXISTING_TYPE_MUTATED_MODEL_VERSION,
      severity: 'error',
      typeName: 'my-type',
      message: 'mutated mv',
    });
    const listrError = new ListrError(original, ListrErrorTypes.HAS_FAILED, stubTask);

    collector.ingestErrors([listrError]);

    const [finding] = collector.getFindings();
    expect(finding.ruleId).toBe(RULE_IDS.EXISTING_TYPE_MUTATED_MODEL_VERSION);
    expect(finding.typeName).toBe('my-type');
    expect(finding.severity).toBe('error');
  });

  it('falls back to generic when a Listr2 ListrError wraps a plain Error', () => {
    const collector = new FindingsCollector();
    const listrError = new ListrError(
      new Error('plain error message'),
      ListrErrorTypes.HAS_FAILED,
      stubTask
    );

    collector.ingestErrors([listrError]);

    const [finding] = collector.getFindings();
    expect(finding.ruleId).toBe(RULE_IDS.GENERIC);
    expect(finding.message).toBe('plain error message');
    expect(finding.typeName).toBeUndefined();
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

  it('deduplicates identical findings (same ruleId + typeName + message)', () => {
    const collector = new FindingsCollector();
    const duplicate = new SavedObjectsCheckError({
      ruleId: RULE_IDS.MODEL_VERSION_MISSING_CREATE_SCHEMA,
      severity: 'error',
      typeName: 'my-type',
      message:
        "The new model version '3' for SO type 'my-type' is missing the 'create' schema definition.",
    });

    // Simulates the same error thrown by both the regular and serverless baseline checks
    collector.ingestErrors([duplicate, duplicate]);

    expect(collector.getFindings()).toHaveLength(1);
  });

  it('merges baselineUrl and serverlessBaselineUrl from duplicate findings into one', () => {
    const collector = new FindingsCollector();
    const regularErr = new SavedObjectsCheckError({
      ruleId: RULE_IDS.MODEL_VERSION_MISSING_CREATE_SCHEMA,
      severity: 'error',
      typeName: 'my-type',
      message:
        "The new model version '3' for SO type 'my-type' is missing the 'create' schema definition.",
      baselineUrl: 'https://storage.googleapis.com/kibana-so-types-snapshots/abc123.json',
    });
    const serverlessErr = new SavedObjectsCheckError({
      ruleId: RULE_IDS.MODEL_VERSION_MISSING_CREATE_SCHEMA,
      severity: 'error',
      typeName: 'my-type',
      message:
        "The new model version '3' for SO type 'my-type' is missing the 'create' schema definition.",
      serverlessBaselineUrl: 'https://storage.googleapis.com/kibana-so-types-snapshots/def456.json',
    });

    collector.ingestErrors([regularErr, serverlessErr]);

    const findings = collector.getFindings();
    expect(findings).toHaveLength(1);
    expect(findings[0].baselineUrl).toBe(
      'https://storage.googleapis.com/kibana-so-types-snapshots/abc123.json'
    );
    expect(findings[0].serverlessBaselineUrl).toBe(
      'https://storage.googleapis.com/kibana-so-types-snapshots/def456.json'
    );
  });

  it('merges fixHint and docsAnchor from duplicate findings when absent on the first occurrence', () => {
    const collector = new FindingsCollector();
    // First occurrence has no fixHint/docsAnchor (e.g. regular baseline check)
    const firstErr = new SavedObjectsCheckError({
      ruleId: RULE_IDS.MODEL_VERSION_MISSING_CREATE_SCHEMA,
      severity: 'error',
      typeName: 'my-type',
      message: "Missing 'create' schema.",
      baselineUrl: 'https://storage.googleapis.com/kibana-so-types-snapshots/abc.json',
    });
    // Second occurrence carries the hints (e.g. serverless baseline check)
    const secondErr = new SavedObjectsCheckError({
      ruleId: RULE_IDS.MODEL_VERSION_MISSING_CREATE_SCHEMA,
      severity: 'error',
      typeName: 'my-type',
      message: "Missing 'create' schema.",
      serverlessBaselineUrl: 'https://storage.googleapis.com/kibana-so-types-snapshots/def.json',
      fixHint: 'Add a create schema to the model version.',
      docsAnchor: '#defining-model-versions',
    });

    collector.ingestErrors([firstErr, secondErr]);

    const [finding] = collector.getFindings();
    expect(finding.fixHint).toBe('Add a create schema to the model version.');
    expect(finding.docsAnchor).toBe('#defining-model-versions');
    // Both URLs are preserved
    expect(finding.baselineUrl).toBe(
      'https://storage.googleapis.com/kibana-so-types-snapshots/abc.json'
    );
    expect(finding.serverlessBaselineUrl).toBe(
      'https://storage.googleapis.com/kibana-so-types-snapshots/def.json'
    );
  });

  it('keeps findings that share a ruleId but differ in typeName', () => {
    const collector = new FindingsCollector();
    const errFoo = new SavedObjectsCheckError({
      ruleId: RULE_IDS.MODEL_VERSION_MISSING_CREATE_SCHEMA,
      severity: 'error',
      typeName: 'foo',
      message:
        "The new model version '3' for SO type 'foo' is missing the 'create' schema definition.",
    });
    const errBar = new SavedObjectsCheckError({
      ruleId: RULE_IDS.MODEL_VERSION_MISSING_CREATE_SCHEMA,
      severity: 'error',
      typeName: 'bar',
      message:
        "The new model version '3' for SO type 'bar' is missing the 'create' schema definition.",
    });

    collector.ingestErrors([errFoo, errBar]);

    expect(collector.getFindings()).toHaveLength(2);
    expect(collector.getFindings().map((f) => f.typeName)).toEqual(['foo', 'bar']);
  });
});
