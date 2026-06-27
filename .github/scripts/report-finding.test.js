'use strict';

// @ts-check

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  normalizeFinding,
  parseFindingInput,
  reportFinding,
  validateFinding,
} = require('./report-finding');

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'report-finding-'));

test('parseFindingInput parses JSON and reports invalid JSON clearly', () => {
  assert.deepEqual(parseFindingInput('{"reviewer":"general-reviewer"}'), {
    reviewer: 'general-reviewer',
  });
  assert.throws(() => parseFindingInput('{nope'), /invalid JSON/);
});

test('validateFinding reports missing and invalid fields', () => {
  assert.deepEqual(validateFinding({}), [
    'reviewer: required non-empty string',
    'path: required non-empty string',
    'line: required positive integer',
    'body: required non-empty string',
  ]);

  assert.deepEqual(
    validateFinding({
      reviewer: 'general-reviewer',
      path: 'src/a.ts',
      line: 1,
      body: 'body',
      suggestion: 42,
    }),
    ['suggestion: must be a string when provided']
  );
});

test('normalizeFinding trims identifiers and omits empty suggestion', () => {
  assert.deepEqual(
    normalizeFinding({
      reviewer: ' general-reviewer ',
      path: ' src/a.ts ',
      line: 7,
      body: 'body',
      suggestion: '',
    }),
    {
      reviewer: 'general-reviewer',
      path: 'src/a.ts',
      line: 7,
      body: 'body',
    }
  );
});

test('reportFinding appends a finding to the reviewer JSONL file', (t) => {
  const findingsDir = makeTempDir();
  t.after(() => fs.rmSync(findingsDir, { recursive: true, force: true }));

  const result = reportFinding(
    JSON.stringify({
      reviewer: 'general-reviewer',
      path: 'src/a.ts',
      line: 3,
      body: 'bug',
      suggestion: 'fix',
    }),
    findingsDir
  );

  assert.equal(result, 'recorded src/a.ts:3');

  const output = fs.readFileSync(path.join(findingsDir, 'general-reviewer.jsonl'), 'utf8');
  assert.deepEqual(JSON.parse(output), {
    reviewer: 'general-reviewer',
    path: 'src/a.ts',
    line: 3,
    body: 'bug',
    suggestion: 'fix',
  });
});
