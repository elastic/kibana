'use strict';

// @ts-check

/**
 * report-finding.js
 *
 * CLI tool for sub-reviewer agents to record a structured finding.
 * Reads one JSON object from stdin, validates it, and appends it to
 * /tmp/gh-aw/findings/<reviewer>.jsonl.
 *
 * Usage (from Bash tool inside a sub-agent):
 *
 *   node .github/scripts/report-finding.js << 'EOF'
 *   {
 *     "reviewer": "scout-reviewer",
 *     "path": "x-pack/plugins/foo/test/scout_tests/foo.spec.ts",
 *     "line": 42,
 *     "body": "Explanation of the issue and the practical risk.",
 *     "suggestion": "optional replacement text for a GitHub suggested change"
 *   }
 *   EOF
 *
 * Fields:
 *   reviewer   (required) - the sub-agent name, used to bucket findings by file
 *   path       (required) - repo-relative file path
 *   line       (required) - 1-based line number on the RIGHT side of the diff
 *   body       (required) - the review comment body (markdown)
 *   suggestion (optional) - replacement text for a GitHub suggested change;
 *                           only for small, directly applicable fixes
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {{ reviewer?: unknown, path?: unknown, line?: unknown, body?: unknown, suggestion?: unknown }} RawFinding
 * @typedef {{ reviewer: string, path: string, line: number, body: string, suggestion?: string }} FindingRecord
 */

const FINDINGS_DIR = '/tmp/gh-aw/findings';

/**
 * @param {string} raw
 * @returns {RawFinding}
 */
const parseFindingInput = (raw) => {
  try {
    return JSON.parse(raw.trim());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`invalid JSON - ${message}`);
  }
};

/**
 * @param {RawFinding} finding
 * @returns {string[]}
 */
const validateFinding = (finding) => {
  const errors = [];

  if (!finding.reviewer || typeof finding.reviewer !== 'string' || !finding.reviewer.trim()) {
    errors.push('reviewer: required non-empty string');
  }
  if (!finding.path || typeof finding.path !== 'string' || !finding.path.trim()) {
    errors.push('path: required non-empty string');
  }
  if (
    typeof finding.line !== 'number' ||
    !Number.isInteger(finding.line) ||
    finding.line < 1
  ) {
    errors.push('line: required positive integer');
  }
  if (!finding.body || typeof finding.body !== 'string' || !finding.body.trim()) {
    errors.push('body: required non-empty string');
  }
  if (finding.suggestion !== undefined && typeof finding.suggestion !== 'string') {
    errors.push('suggestion: must be a string when provided');
  }

  return errors;
};

/**
 * @param {RawFinding} finding
 * @returns {FindingRecord}
 */
const normalizeFinding = (finding) => {
  const errors = validateFinding(finding);
  if (errors.length > 0) {
    throw new Error(`validation failed:\n${errors.map((error) => `  - ${error}`).join('\n')}`);
  }

  if (
    typeof finding.reviewer !== 'string' ||
    typeof finding.path !== 'string' ||
    typeof finding.line !== 'number' ||
    typeof finding.body !== 'string'
  ) {
    throw new Error('validation failed');
  }

  /** @type {FindingRecord} */
  const record = {
    reviewer: finding.reviewer.trim(),
    path: finding.path.trim(),
    line: finding.line,
    body: finding.body,
  };

  if (typeof finding.suggestion === 'string' && finding.suggestion) {
    record.suggestion = finding.suggestion;
  }

  return record;
};

/**
 * @param {FindingRecord} record
 * @param {string} findingsDir
 * @returns {void}
 */
const appendFinding = (record, findingsDir = FINDINGS_DIR) => {
  fs.mkdirSync(findingsDir, { recursive: true });
  fs.appendFileSync(
    path.join(findingsDir, `${record.reviewer}.jsonl`),
    `${JSON.stringify(record)}\n`
  );
};

/**
 * @param {string} raw
 * @param {string} [findingsDir]
 * @returns {string}
 */
const reportFinding = (raw, findingsDir = FINDINGS_DIR) => {
  const record = normalizeFinding(parseFindingInput(raw));
  appendFinding(record, findingsDir);
  return `recorded ${record.path}:${record.line}`;
};

const main = () => {
  let raw = '';

  process.stdin.on('data', (chunk) => {
    raw += chunk;
  });

  process.stdin.on('end', () => {
    try {
      process.stdout.write(`${reportFinding(raw)}\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`report-finding: ${message}`);
      process.exit(1);
    }
  });
};

if (require.main === module) {
  main();
}

module.exports = {
  appendFinding,
  normalizeFinding,
  parseFindingInput,
  reportFinding,
  validateFinding,
};
