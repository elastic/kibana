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

import { collectFailedTestNames, computeIntersection } from './retry_result_checker';

// Minimal JUnit XML helpers
const buildXml = (testcases: string) => `<?xml version="1.0" encoding="utf-8"?>
<testsuites name="ftr">
  <testsuite>${testcases}</testsuite>
</testsuites>`;

const failedCase = (name: string) =>
  `<testcase name="${name}" classname="suite.file" time="1"><failure>error</failure></testcase>`;

const passedCase = (name: string) =>
  `<testcase name="${name}" classname="suite.file" time="1"></testcase>`;

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
