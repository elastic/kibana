/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Re-keys Jest `.snap` files for Vitest without running the tests: Jest joins describe/test names
 * with ' ' (hints with ': '), Vitest with ' > '. The describe/test structure is read statically
 * from the test file; keys that can't be matched unambiguously are left alone and reported.
 * Values are not touched (`toThrowErrorMatchingSnapshot` values still need `vitest -u`).
 *
 * Usage: node src/platform/packages/shared/kbn-test/src/vitest/codemod/migrate_snapshot_keys.js <file.snap...>
 */

const Fs = require('fs');
const Path = require('path');
const Ts = require('typescript');

const BLOCKS = new Set(['describe', 'fdescribe', 'xdescribe', 'it', 'fit', 'xit', 'test', 'xtest']);
const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// `.each` titles interpolate printf placeholders and `$variables`
const eachTitleRe = (text) =>
  escapeRe(text)
    .replace(/%[sdifjopO#]/g, '.+?')
    .replace(/\\\$[\w.]+/g, '.+?');

const blockName = (callee) => {
  let node = callee;
  let isEach = false;
  for (;;) {
    if (Ts.isCallExpression(node)) {
      node = node.expression; // describe.each(table)(title, fn)
    } else if (Ts.isTaggedTemplateExpression(node)) {
      node = node.tag;
    } else if (Ts.isPropertyAccessExpression(node)) {
      if (node.name.text === 'each') isEach = true;
      node = node.expression;
    } else break;
  }
  return Ts.isIdentifier(node) && BLOCKS.has(node.text) ? { isEach } : undefined;
};

const titlePattern = (arg, isEach) => {
  if (!arg) return undefined;
  if (Ts.isStringLiteral(arg) || Ts.isNoSubstitutionTemplateLiteral(arg)) {
    return isEach ? eachTitleRe(arg.text) : escapeRe(arg.text);
  }
  if (Ts.isTemplateExpression(arg)) {
    const parts = [arg.head.text, ...arg.templateSpans.map((span) => span.literal.text)];
    return parts.map((part) => (isEach ? eachTitleRe(part) : escapeRe(part))).join('.+?');
  }
  return '.+?';
};

/**
 * Returns every root-to-block path of title regex sources, and whether the block's only
 * file snapshots are `toThrowErrorMatchingSnapshot` ones.
 */
const collectPaths = (sourceFile) => {
  const paths = [];
  const visit = (node, parents) => {
    if (Ts.isCallExpression(node)) {
      const block = blockName(node.expression);
      if (block) {
        const pattern = titlePattern(node.arguments[0], block.isEach);
        if (pattern) {
          const patterns = [...parents, pattern];
          const body = node.arguments
            .slice(1)
            .map((arg) => arg.getText(sourceFile))
            .join('\n');
          paths.push({
            patterns,
            throwsOnly:
              body.includes('toThrowErrorMatchingSnapshot') && !/toMatchSnapshot/.test(body),
          });
          node.arguments.slice(1).forEach((arg) => visit(arg, patterns));
          return;
        }
      }
    }
    Ts.forEachChild(node, (child) => visit(child, parents));
  };
  visit(sourceFile, []);
  return paths;
};

/**
 * Maps the Vitest name(s) for a Jest snapshot name to whether the test only snapshots errors.
 * When dynamic titles make the split ambiguous ("a b c" = ["a b", "c"] or ["a", "b c"]), the
 * match whose dynamic titles consume the fewest characters wins.
 */
const matchKey = (paths, name) => {
  const matches = new Map();
  for (const { patterns, throwsOnly } of paths) {
    const titles = patterns.map((part) => `(${part})`).join(' ');
    // a dynamic title can also swallow a ': ' Jest would print for a hint; prefer no hint
    for (const [suffix, penalty] of [
      ['', 0],
      [': ([\\s\\S]+)', name.length],
    ]) {
      const match = new RegExp(`^${titles}${suffix}$`).exec(name);
      if (!match) continue;
      const segments = match.slice(1, patterns.length + 1);
      const hint = match[patterns.length + 1];
      const score = segments.reduce(
        (sum, segment, i) => (patterns[i].includes('.+?') ? sum + segment.length : sum),
        penalty
      );
      const result = [...segments, ...(hint ? [hint] : [])].join(' > ');
      const prev = matches.get(result);
      if (!prev || score < prev.score) matches.set(result, { score, throwsOnly });
    }
  }
  const best = Math.min(...[...matches.values()].map(({ score }) => score));
  return new Map(
    [...matches]
      .filter(([, { score }]) => score === best)
      .map(([result, { throwsOnly }]) => [result, throwsOnly])
  );
};

const findTestFile = (snapFile) => {
  const dir = Path.dirname(Path.dirname(snapFile));
  const candidate = Path.join(dir, Path.basename(snapFile, '.snap'));
  return Fs.existsSync(candidate) ? candidate : undefined;
};

// .snap files store keys and values as template literal contents
const unescape = (raw) => raw.replace(/\\(`|\\|\$\{)/g, '$1');
const escape = (text) => text.replace(/`|\\|\$\{/g, '\\$&');

/** Jest stores thrown errors as the quoted message, Vitest as `[Error: message]`. */
const toVitestError = (value) => {
  const match = /^(\n?)"((?:[^"\\]|\\[\s\S])*)"(\n?)$/.exec(value);
  return match ? `${match[1]}[Error: ${match[2].replace(/\\(["\\])/g, '$1')}]${match[3]}` : value;
};

const stats = { renamed: 0, errorValues: 0, dropped: 0, unmatched: 0 };
for (const snapFile of process.argv.slice(2)) {
  const testFile = findTestFile(snapFile);
  if (!testFile) {
    process.stdout.write(`NO_TEST_FILE ${snapFile}\n`);
    continue;
  }
  const code = Fs.readFileSync(testFile, 'utf8');
  const kind = /\.tsx$|\.jsx?$/.test(testFile) ? Ts.ScriptKind.TSX : Ts.ScriptKind.TS;
  const paths = collectPaths(
    Ts.createSourceFile(testFile, code, Ts.ScriptTarget.Latest, true, kind)
  );

  const source = Fs.readFileSync(snapFile, 'utf8');
  const entry = /^exports\[`((?:[^`\\]|\\[\s\S])*)`\] = `((?:[^`\\]|\\[\s\S])*)`;(\n\n)?/gm;
  const existing = new Set([...source.matchAll(entry)].map(([, rawKey]) => unescape(rawKey)));
  const next = source.replace(entry, (whole, rawKey, rawValue, separator = '') => {
    const key = unescape(rawKey);
    const [, name, count] = /^([\s\S]*) (\d+)$/.exec(key) ?? [];
    if (name === undefined || name.includes(' > ')) return whole;
    const results = matchKey(paths, name);
    if (results.size !== 1) {
      process.stdout.write(`UNMATCHED(${results.size}) ${snapFile} :: ${key}\n`);
      stats.unmatched++;
      return whole;
    }
    const [[vitestName, throwsOnly]] = results;
    const vitestKey = `${vitestName} ${count}`;
    if (vitestKey !== key && existing.has(vitestKey)) {
      // an obsolete Jest entry left next to the one `vitest -u` already wrote
      stats.dropped++;
      return '';
    }
    const value = unescape(rawValue);
    const nextValue = throwsOnly ? toVitestError(value) : value;
    if (vitestKey === key && nextValue === value) return whole;
    if (vitestKey !== key) stats.renamed++;
    if (nextValue !== value) stats.errorValues++;
    return `exports[\`${escape(vitestKey)}\`] = \`${escape(nextValue)}\`;${separator}`;
  });
  if (next !== source) {
    Fs.writeFileSync(
      snapFile,
      next.replace(
        /^\/\/ Jest Snapshot v1, https:\/\/goo\.gl\/fbAQLP/,
        '// Vitest Snapshot v1, https://vitest.dev/guide/snapshot.html'
      )
    );
  }
}
process.stdout.write(
  `${Object.entries(stats)
    .map(([name, count]) => `${name}=${count}`)
    .join(' ')}
`
);
