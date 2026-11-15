/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';
import { EXPECTED_TYPES } from './types';
import type { ExpectedType, FixtureFile } from './types';

const FIXTURES_DIR = path.resolve(__dirname, '../canary');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const validate = (raw: unknown, filename: string): FixtureFile => {
  if (!isRecord(raw)) throw new Error(`Fixture ${filename}: expected a YAML mapping`);
  if (typeof raw.spec_id !== 'string' || raw.spec_id === '') {
    throw new Error(`Fixture ${filename}: missing spec_id`);
  }
  if (!Array.isArray(raw.cases) || raw.cases.length === 0) {
    throw new Error(`Fixture ${filename}: "cases" must be a non-empty list`);
  }

  const cases = raw.cases.map((rawCase: unknown, index: number) => {
    const where = `Fixture ${filename}, case ${index + 1}`;
    if (!isRecord(rawCase)) throw new Error(`${where}: expected a mapping`);
    if (typeof rawCase.action !== 'string' || rawCase.action === '') {
      throw new Error(`${where}: missing action`);
    }
    const input = rawCase.input ?? {};
    if (!isRecord(input)) throw new Error(`${where}: "input" must be a mapping`);
    if (!Array.isArray(rawCase.expect) || rawCase.expect.length === 0) {
      throw new Error(`${where}: "expect" must be a non-empty list`);
    }

    const expectations = rawCase.expect.map((rawExpectation: unknown) => {
      if (
        !isRecord(rawExpectation) ||
        typeof rawExpectation.path !== 'string' ||
        rawExpectation.path === ''
      ) {
        throw new Error(`${where}: every "expect" entry needs a "path"`);
      }
      if (rawExpectation.path !== '$' && rawExpectation.path.split('.').includes('')) {
        throw new Error(`${where}: path "${rawExpectation.path}" has an empty segment`);
      }
      if (!EXPECTED_TYPES.includes(rawExpectation.type as ExpectedType)) {
        throw new Error(
          `${where}: expect "${rawExpectation.path}" has invalid type "${String(
            rawExpectation.type
          )}" (one of ${EXPECTED_TYPES.join(', ')})`
        );
      }
      return { path: rawExpectation.path, type: rawExpectation.type as ExpectedType };
    });

    return {
      action: rawCase.action,
      ...(typeof rawCase.name === 'string' ? { name: rawCase.name } : {}),
      ...(typeof rawCase.enabled === 'boolean' ? { enabled: rawCase.enabled } : {}),
      input,
      expect: expectations,
    };
  });

  return { spec_id: raw.spec_id, cases };
};

/** Loads and validates the `.yaml` fixture files in the canary directory; a `.yml` file or a repeated `spec_id` is an error. */
export const loadFixtures = (fixturesDir: string = FIXTURES_DIR): FixtureFile[] => {
  const allFiles = fs.readdirSync(fixturesDir);
  // A `.yml` file would otherwise be skipped without a word, leaving its connector untested.
  const misnamed = allFiles.find((f) => f.endsWith('.yml'));
  if (misnamed) throw new Error(`Fixture ${misnamed}: fixture files must use the .yaml extension`);
  const files = allFiles.filter((f) => f.endsWith('.yaml'));
  const seen = new Map<string, string>();
  return files.map((file) => {
    const content = fs.readFileSync(path.join(fixturesDir, file), 'utf-8');
    const fixture = validate(parse(content), file);
    // Fixtures run concurrently against one connector per spec, so two files for a spec would race to create it.
    const firstFile = seen.get(fixture.spec_id);
    if (firstFile) {
      throw new Error(
        `Fixture ${file}: spec_id ${fixture.spec_id} is already used by ${firstFile}; put all its cases in one file`
      );
    }
    seen.set(fixture.spec_id, file);
    return fixture;
  });
};
