/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';

import {
  collectFailedTestNames,
  collectNewFailedTestNames,
  collectPassedTestNames,
  computeIntersection,
  snapshotJunitDir,
} from './retry_result_checker';

// Minimal JUnit XML helpers
const buildXml = (testcases: string) => `<?xml version="1.0" encoding="utf-8"?>
<testsuites name="ftr">
  <testsuite>${testcases}</testsuite>
</testsuites>`;

const failedCase = (name: string) =>
  `<testcase name="${name}" classname="suite.file" time="1"><failure>error</failure></testcase>`;

const passedCase = (name: string) =>
  `<testcase name="${name}" classname="suite.file" time="1"></testcase>`;

const skippedCase = (name: string) =>
  `<testcase name="${name}" classname="suite.file" time="1"><skipped/></testcase>`;

const hookFailure = (hookName: string) =>
  `<testcase name='suite "${hookName}" hook' classname="suite.file" time="0"><failure>error</failure></testcase>`;

describe('collectFailedTestNames', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'retry-checker-test-'));
  });

  afterEach(() => {
    Fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns names of failed tests from a single XML', async () => {
    Fs.writeFileSync(
      Path.join(tmpDir, 'TEST-report.xml'),
      buildXml(failedCase('suite myTest') + passedCase('suite otherTest'))
    );
    const names = await collectFailedTestNames(tmpDir);
    expect([...names]).toEqual(['suite myTest']);
  });

  it('aggregates failures across multiple XML files', async () => {
    Fs.writeFileSync(Path.join(tmpDir, 'TEST-a.xml'), buildXml(failedCase('test A')));
    Fs.writeFileSync(Path.join(tmpDir, 'TEST-b.xml'), buildXml(failedCase('test B')));
    const names = await collectFailedTestNames(tmpDir);
    expect([...names].sort()).toEqual(['test A', 'test B']);
  });

  it('returns empty set when all tests pass', async () => {
    Fs.writeFileSync(Path.join(tmpDir, 'TEST-a.xml'), buildXml(passedCase('test A')));
    const names = await collectFailedTestNames(tmpDir);
    expect(names.size).toBe(0);
  });

  it('returns empty set when no XML files exist', async () => {
    const names = await collectFailedTestNames(tmpDir);
    expect(names.size).toBe(0);
  });

  it('captures hook failure names verbatim', async () => {
    Fs.writeFileSync(Path.join(tmpDir, 'TEST-a.xml'), buildXml(hookFailure('before all')));
    const names = await collectFailedTestNames(tmpDir);
    expect([...names]).toEqual(['suite "before all" hook']);
  });
});

describe('collectPassedTestNames', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'retry-checker-test-'));
  });

  afterEach(() => {
    Fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns only tests that passed (no failure, no skipped)', async () => {
    Fs.writeFileSync(
      Path.join(tmpDir, 'TEST-report.xml'),
      buildXml(passedCase('test A') + failedCase('test B') + skippedCase('test C'))
    );
    const names = await collectPassedTestNames(tmpDir);
    expect([...names]).toEqual(['test A']);
  });

  it('does not count skipped tests as passed (beforeAll hook scenario)', async () => {
    Fs.writeFileSync(Path.join(tmpDir, 'TEST-a.xml'), buildXml(skippedCase('test A')));
    const names = await collectPassedTestNames(tmpDir);
    expect(names.size).toBe(0);
  });

  it('returns empty set when no XML files exist (runner crash scenario)', async () => {
    const names = await collectPassedTestNames(tmpDir);
    expect(names.size).toBe(0);
  });

  it('aggregates passed tests across multiple XML files', async () => {
    Fs.writeFileSync(Path.join(tmpDir, 'TEST-a.xml'), buildXml(passedCase('test A')));
    Fs.writeFileSync(
      Path.join(tmpDir, 'TEST-b.xml'),
      buildXml(passedCase('test B') + failedCase('test C'))
    );
    const names = await collectPassedTestNames(tmpDir);
    expect([...names].sort()).toEqual(['test A', 'test B']);
  });

  it('finds a recovered test even when a stale attempt-1 XML is present', async () => {
    // Stale file from attempt 1 where the test failed
    Fs.writeFileSync(
      Path.join(tmpDir, 'TEST-attempt1-bk__OLD.xml'),
      buildXml(failedCase('test A'))
    );
    // New file from attempt 2 where the test passes
    Fs.writeFileSync(
      Path.join(tmpDir, 'TEST-attempt2-bk__NEW.xml'),
      buildXml(passedCase('test A'))
    );
    const names = await collectPassedTestNames(tmpDir);
    expect(names.has('test A')).toBe(true);
  });

  it('does not count a test as passed when it fails in both attempts (stale XMLs present)', async () => {
    // Stale file from attempt 1: test A failed
    Fs.writeFileSync(
      Path.join(tmpDir, 'TEST-attempt1-bk__OLD.xml'),
      buildXml(failedCase('test A'))
    );
    // New file from attempt 2: test A still fails
    Fs.writeFileSync(
      Path.join(tmpDir, 'TEST-attempt2-bk__NEW.xml'),
      buildXml(failedCase('test A'))
    );
    const names = await collectPassedTestNames(tmpDir);
    expect(names.has('test A')).toBe(false);
  });
});

describe('snapshotJunitDir + collectNewFailedTestNames', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'retry-checker-test-'));
  });

  afterEach(() => {
    Fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns only failures from XMLs written after the snapshot', async () => {
    Fs.writeFileSync(Path.join(tmpDir, 'TEST-existing.xml'), buildXml(failedCase('old failure')));
    await snapshotJunitDir(tmpDir);
    Fs.writeFileSync(Path.join(tmpDir, 'TEST-new.xml'), buildXml(failedCase('new failure')));

    const names = await collectNewFailedTestNames(tmpDir);
    expect([...names]).toEqual(['new failure']);
  });

  it('deletes the snapshot file after reading', async () => {
    await snapshotJunitDir(tmpDir);
    await collectNewFailedTestNames(tmpDir);

    expect(Fs.existsSync(Path.join(tmpDir, '.smart_retry_snapshot'))).toBe(false);
  });

  it('treats all XMLs as new when no snapshot exists', async () => {
    Fs.writeFileSync(Path.join(tmpDir, 'TEST-a.xml'), buildXml(failedCase('test A')));

    const names = await collectNewFailedTestNames(tmpDir);
    expect([...names]).toEqual(['test A']);
  });

  it('returns empty set when no new XMLs were written after the snapshot', async () => {
    Fs.writeFileSync(Path.join(tmpDir, 'TEST-existing.xml'), buildXml(failedCase('old failure')));
    await snapshotJunitDir(tmpDir);

    const names = await collectNewFailedTestNames(tmpDir);
    expect(names.size).toBe(0);
  });
});

describe('computeIntersection', () => {
  it('returns empty when no overlap', () => {
    const prev = new Set(['test A', 'test B']);
    const current = new Set(['test C']);
    expect(computeIntersection(prev, current)).toEqual([]);
  });

  it('returns overlapping tests', () => {
    const prev = new Set(['test A', 'test B']);
    const current = new Set(['test A', 'test C']);
    expect(computeIntersection(prev, current)).toEqual(['test A']);
  });

  it('returns empty when current is empty', () => {
    const prev = new Set(['test A']);
    const current = new Set<string>();
    expect(computeIntersection(prev, current)).toEqual([]);
  });

  it('returns empty when prev is empty', () => {
    const prev = new Set<string>();
    const current = new Set(['test A']);
    expect(computeIntersection(prev, current)).toEqual([]);
  });

  it('returns all current failures when all were previously failing', () => {
    const prev = new Set(['test A', 'test B']);
    const current = new Set(['test A', 'test B']);
    expect(computeIntersection(prev, current).sort()).toEqual(['test A', 'test B']);
  });
});
