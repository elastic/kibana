/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-unused-expressions */

import { expect } from 'chai';
import { getKibanaDir, getVersionsFile } from './utils';
import fs from 'fs';

// TODO: replace mocha with jest, and write tests that mock FS

describe('getKibanaDir', () => {
  it('should return the kibana directory', () => {
    const kibanaDir = getKibanaDir();

    expect(kibanaDir).to.be.ok;
    expect(fs.existsSync(kibanaDir)).to.be.true;
  });
});

describe('getVersionsFile', () => {
  it('should return the versions file', () => {
    const versionsFile = getVersionsFile();

    expect(versionsFile).to.be.ok;
    expect(versionsFile.versions).to.be.an('array');
  });

  it('should correctly find prevMajor and prevMinor versions', () => {
    const versionsFile = getVersionsFile();

    expect(versionsFile.prevMajors).to.be.an('array');
    expect(versionsFile.prevMinors).to.be.an('array');
  });

  // TODO: write more tests with mocking...
});
