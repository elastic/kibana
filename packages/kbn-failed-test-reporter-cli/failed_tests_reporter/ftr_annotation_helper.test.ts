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

import { collectNewFailedTestNames, snapshotJunitDir } from './ftr_annotation_helper';

const buildXml = (testcases: string) => `<?xml version="1.0" encoding="utf-8"?>
<testsuites name="ftr">
  <testsuite>${testcases}</testsuite>
</testsuites>`;

const failedCase = (name: string) =>
  `<testcase name="${name}" classname="suite.file" time="1"><failure>error</failure></testcase>`;

const passedCase = (name: string) =>
  `<testcase name="${name}" classname="suite.file" time="1"></testcase>`;

describe('snapshotJunitDir + collectNewFailedTestNames', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'annotation-helper-test-'));
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

    expect(Fs.existsSync(Path.join(tmpDir, '.ftr_annotation_snapshot'))).toBe(false);
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

  it('ignores passing tests in new XMLs', async () => {
    await snapshotJunitDir(tmpDir);
    Fs.writeFileSync(
      Path.join(tmpDir, 'TEST-new.xml'),
      buildXml(passedCase('test A') + failedCase('test B'))
    );

    const names = await collectNewFailedTestNames(tmpDir);
    expect([...names]).toEqual(['test B']);
  });
});
