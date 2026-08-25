/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

import { isGeneratedJestConfig } from './is_generated_jest_config';

let tmpRoot: string;

beforeAll(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'is-generated-jest-config-'));
});

afterAll(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

let counter = 0;
/** Write a jest config under a fresh package dir and return its absolute path. */
const writeConfig = (source: string): string => {
  const dir = path.join(tmpRoot, `pkg-${counter++}`, 'nested');
  fs.mkdirSync(dir, { recursive: true });
  const abs = path.join(dir, 'jest.config.js');
  fs.writeFileSync(abs, source);
  return abs;
};

describe('isGeneratedJestConfig', () => {
  it('recognizes the unmodified web-package template', () => {
    const abs = writeConfig(
      `module.exports = { preset: '@kbn/test', rootDir: '../..', roots: ['<rootDir>/pkg-0/nested'] };`
    );
    expect(isGeneratedJestConfig(abs)).toBe(true);
  });

  it('recognizes the unmodified node-package template', () => {
    const abs = writeConfig(
      `module.exports = { preset: '@kbn/test/jest_node', rootDir: '../..', roots: ['<rootDir>/pkg-1/nested'] };`
    );
    expect(isGeneratedJestConfig(abs)).toBe(true);
  });

  it('rejects a config with an extra key (e.g. testMatch)', () => {
    const abs = writeConfig(
      `module.exports = { preset: '@kbn/test', rootDir: '../..', roots: ['<rootDir>/pkg-2/nested'], testMatch: ['**/*.test.ts'] };`
    );
    expect(isGeneratedJestConfig(abs)).toBe(false);
  });

  it('rejects a config with coverage customization', () => {
    const abs = writeConfig(
      `module.exports = { preset: '@kbn/test', rootDir: '../..', roots: ['<rootDir>/pkg-3/nested'], collectCoverageFrom: ['**/*.ts'] };`
    );
    expect(isGeneratedJestConfig(abs)).toBe(false);
  });

  it('rejects a config with more than one root', () => {
    const abs = writeConfig(
      `module.exports = { preset: '@kbn/test', rootDir: '../..', roots: ['<rootDir>/pkg-4/nested', '<rootDir>/pkg-4/other'] };`
    );
    expect(isGeneratedJestConfig(abs)).toBe(false);
  });

  it('rejects a config whose single root does not point at its own directory', () => {
    const abs = writeConfig(
      `module.exports = { preset: '@kbn/test', rootDir: '../..', roots: ['<rootDir>/somewhere/else'] };`
    );
    expect(isGeneratedJestConfig(abs)).toBe(false);
  });

  it('rejects an integration preset (the generator never emits integration configs)', () => {
    const abs = writeConfig(
      `module.exports = { preset: '@kbn/test/jest_integration', rootDir: '../..', roots: ['<rootDir>/pkg-6/nested'] };`
    );
    expect(isGeneratedJestConfig(abs)).toBe(false);
  });

  it('rejects an unknown preset', () => {
    const abs = writeConfig(
      `module.exports = { preset: 'some-other-preset', rootDir: '../..', roots: ['<rootDir>/pkg-7/nested'] };`
    );
    expect(isGeneratedJestConfig(abs)).toBe(false);
  });

  it('returns false when the config cannot be required', () => {
    const abs = writeConfig(`module.exports = { this is not valid js `);
    expect(isGeneratedJestConfig(abs)).toBe(false);
  });
});
