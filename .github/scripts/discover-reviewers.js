'use strict';

// @ts-check

/**
 * discover-reviewers.js
 *
 * Pre-agent step that runs before the coordinator. For each file found under
 * .github/instructions/*.instructions.md, writes a Codex sub-agent definition:
 *   - .codex/agents/<name>.toml
 *
 * Each definition includes an injected Setup section pointing to a precomputed
 * filtered diff under /tmp/gh-aw/diffs. The diffs are generated from the
 * prefetched PR diff artifact so sub-agents don't depend on filtered workflow
 * environment variables such as GITHUB_SHA.
 *
 * Writes /tmp/gh-aw/reviewers.json so the coordinator knows which sub-agents
 * to launch, plus /tmp/gh-aw/reviewers.csv so the coordinator can read the
 * configured agent names without transforming JSON.
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {{ body: string, applyTo?: string, name?: string, description?: string }} InstructionFile
 * @typedef {{ oldPath: string, newPath: string, content: string }} DiffFile
 * @typedef {{ name: string, description: string }} Reviewer
 * @typedef {{
 *   instructionsDir?: string,
 *   codexAgentsDir?: string,
 *   diffsDir?: string,
 *   findingsDir?: string,
 *   reviewersPath?: string,
 *   reviewersCsvPath?: string,
 *   prDiffPath?: string,
 *   logger?: Pick<Console, 'log' | 'warn'>,
 * }} DiscoverReviewersOptions
 */

const DEFAULT_PATHS = Object.freeze({
  instructionsDir: '.github/instructions',
  codexAgentsDir: '.codex/agents',
  diffsDir: '/tmp/gh-aw/diffs',
  findingsDir: '/tmp/gh-aw/findings',
  reviewersPath: '/tmp/gh-aw/reviewers.json',
  reviewersCsvPath: '/tmp/gh-aw/reviewers.csv',
  prDiffPath: '/tmp/gh-aw/agent/pr-diff.txt',
});

/**
 * @param {string} content
 * @returns {InstructionFile}
 */
const parseFrontmatter = (content) => {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return { body: content };

  const raw = match[1];
  const body = content.slice(match[0].length);
  /** @type {Partial<Omit<InstructionFile, 'body'>>} */
  const fields = {};

  for (const line of raw.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key === 'applyTo' || key === 'name' || key === 'description') {
      fields[key] = value;
    }
  }

  return { ...fields, body };
};

/**
 * @param {string} applyTo
 * @returns {string[]}
 */
const applyToGlobs = (applyTo) => {
  const stripped = applyTo.trim().replace(/^\{/, '').replace(/\}$/, '');
  return stripped.split(',').map((g) => g.trim()).filter(Boolean);
};

/**
 * @param {string} value
 * @returns {string}
 */
const escapeRegExp = (value) => value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');

/**
 * @param {string} glob
 * @returns {RegExp}
 */
const globToRegExp = (glob) => {
  let source = '^';

  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    const next = glob[i + 1];
    const afterNext = glob[i + 2];

    if (char === '*' && next === '*' && afterNext === '/') {
      source += '(?:.*/)?';
      i += 2;
      continue;
    }

    if (char === '*' && next === '*') {
      source += '.*';
      i += 1;
      continue;
    }

    if (char === '*') {
      source += '[^/]*';
      continue;
    }

    if (char === '?') {
      source += '[^/]';
      continue;
    }

    source += escapeRegExp(char);
  }

  return new RegExp(`${source}$`);
};

/**
 * @param {string} glob
 * @returns {boolean}
 */
const isMatchAllGlob = (glob) => glob === '**/*' || glob === '**';

/**
 * @param {string} filePath
 * @param {string[]} globs
 * @returns {boolean}
 */
const matchesAnyGlob = (filePath, globs) => {
  if (globs.some(isMatchAllGlob)) return true;

  const normalizedPath = filePath.replace(/\\/g, '/');
  return globs.some((glob) => globToRegExp(glob).test(normalizedPath));
};

/**
 * @param {string} diff
 * @returns {DiffFile[]}
 */
const parseDiffFiles = (diff) => {
  /** @type {DiffFile[]} */
  const files = [];
  const matches = [...diff.matchAll(/^diff --git a\/(.+) b\/(.+)$/gm)];

  if (matches.length === 0) {
    return diff.trim() ? [{ oldPath: '', newPath: '', content: diff }] : [];
  }

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const start = match.index ?? 0;
    const next = matches[i + 1];
    const end = next?.index ?? diff.length;

    files.push({
      oldPath: match[1],
      newPath: match[2],
      content: diff.slice(start, end),
    });
  }

  return files;
};

/**
 * @param {DiffFile[]} diffFiles
 * @param {string[]} globs
 * @returns {string}
 */
const filterDiff = (diffFiles, globs) =>
  diffFiles
    .filter(
      ({ oldPath, newPath }) =>
        matchesAnyGlob(oldPath, globs) || matchesAnyGlob(newPath, globs)
    )
    .map(({ content }) => content.trimEnd())
    .filter(Boolean)
    .join('\n');

/**
 * @param {{ name: string, globs: string[], diffFiles: DiffFile[], diffsDir: string }} options
 * @returns {void}
 */
const writeFilteredDiff = ({ name, globs, diffFiles, diffsDir }) => {
  const filteredDiff = filterDiff(diffFiles, globs);
  fs.writeFileSync(
    path.join(diffsDir, `${name}.diff`),
    filteredDiff ? `${filteredDiff}\n` : ''
  );
};

/**
 * @param {string} name
 * @param {string} applyTo
 * @param {string} diffsDir
 * @returns {string}
 */
const buildSetupSection = (name, applyTo, diffsDir) => {
  const globs = applyToGlobs(applyTo);
  const isMatchAll = globs.length === 1 && isMatchAllGlob(globs[0]);
  const diffPath = `${diffsDir}/${name}.diff`;

  const lines = [
    `## Setup`,
    ``,
    `Your filtered diff has already been generated at \`${diffPath}\`. Read it before reviewing.`,
  ];

  if (!isMatchAll) {
    lines.push(
      ``,
      `If \`${diffPath}\` is empty, there are no in-scope changes in this PR; stop here.`
    );
  }

  return lines.join('\n');
};

/**
 * @param {string} value
 * @returns {string}
 */
const tomlString = (value) => JSON.stringify(value);

/**
 * @param {string} name
 * @param {string} description
 * @param {string} setupSection
 * @param {string} body
 * @returns {string}
 */
const buildAgentFile = (name, description, setupSection, body) => {
  const completionInstruction =
    'When all findings are recorded, return a concise completion summary to the coordinator. ' +
    'Do not call safe-output tools directly.';

  const developerInstructions = [
    setupSection,
    ``,
    body.trim(),
    ``,
    completionInstruction,
  ].join('\n');

  return [
    `name = ${tomlString(name)}`,
    `description = ${tomlString(description)}`,
    `developer_instructions = ${tomlString(developerInstructions)}`,
  ].join('\n');
};

/**
 * @param {DiscoverReviewersOptions} [options]
 * @returns {Reviewer[]}
 */
const discoverReviewers = (options = {}) => {
  const {
    instructionsDir = DEFAULT_PATHS.instructionsDir,
    codexAgentsDir = DEFAULT_PATHS.codexAgentsDir,
    diffsDir = DEFAULT_PATHS.diffsDir,
    findingsDir = DEFAULT_PATHS.findingsDir,
    reviewersPath = DEFAULT_PATHS.reviewersPath,
    reviewersCsvPath = DEFAULT_PATHS.reviewersCsvPath,
    prDiffPath = DEFAULT_PATHS.prDiffPath,
    logger = console,
  } = options;

  if (!fs.existsSync(prDiffPath)) {
    throw new Error(`Missing prefetched PR diff at ${prDiffPath}`);
  }

  const diffFiles = parseDiffFiles(fs.readFileSync(prDiffPath, 'utf8'));

  fs.mkdirSync(findingsDir, { recursive: true });
  fs.mkdirSync(diffsDir, { recursive: true });
  fs.mkdirSync(codexAgentsDir, { recursive: true });

  /** @type {string[]} */
  let instructionFiles = [];
  if (fs.existsSync(instructionsDir)) {
    instructionFiles = fs
      .readdirSync(instructionsDir)
      .filter((f) => f.endsWith('.instructions.md'))
      .map((f) => path.join(instructionsDir, f));
  }

  /** @type {Reviewer[]} */
  const reviewers = [];

  for (const file of instructionFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const { body, applyTo, name: rawName, description = '' } = parseFrontmatter(content);

    if (!applyTo) {
      logger.warn(`Skipping ${file}: no applyTo in frontmatter`);
      continue;
    }

    const name = rawName || path.basename(file, '.instructions.md');
    const globs = applyToGlobs(applyTo);
    const setupSection = buildSetupSection(name, applyTo, diffsDir);

    writeFilteredDiff({ name, globs, diffFiles, diffsDir });

    fs.writeFileSync(
      path.join(codexAgentsDir, `${name}.toml`),
      `${buildAgentFile(name, description, setupSection, body)}\n`
    );

    reviewers.push({ name, description });
    logger.log(`Registered reviewer: ${name}`);
  }

  fs.writeFileSync(reviewersPath, JSON.stringify(reviewers, null, 2) + '\n');
  fs.writeFileSync(reviewersCsvPath, reviewers.map((reviewer) => reviewer.name).join(','));
  logger.log(
    `Reviewers: ${reviewers.length ? reviewers.map((r) => r.name).join(', ') : 'none'}`
  );

  return reviewers;
};

const main = () => {
  discoverReviewers();
};

if (require.main === module) {
  main();
}

module.exports = {
  applyToGlobs,
  buildAgentFile,
  buildSetupSection,
  discoverReviewers,
  filterDiff,
  globToRegExp,
  matchesAnyGlob,
  parseDiffFiles,
  parseFrontmatter,
};
