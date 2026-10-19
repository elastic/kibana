/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Runs esql_exceptions_try.mjs for every combination of the layers below, answering its questions from stdin, and reports the runs
// where the rule does not do what the script predicts. It never starts Elasticsearch or Kibana; it needs the stack to be running.
//
//   node esql_exceptions_try_matrix.mjs --list                    count the cases of each layer, run nothing
//   node esql_exceptions_try_matrix.mjs --check-prompts           feed every case to the script with no stack, to check the answers
//   node esql_exceptions_try_matrix.mjs                           run every case, with the setting on and then off
//   node esql_exceptions_try_matrix.mjs --restore                 after a crash: restore the setting and remove what the runs left
//
// Options: --layers=1,2,3  --setting=on|off|both  --only=text  --limit=n  --concurrency=n (default 4, at most 16)  --retries=n (default 1)
//          --timeout=seconds (default 240)  --full-types  --no-cleanup  --fresh  --rerun-differs
//          --out=file (default esql_try_matrix_results.jsonl)  --log=file (default: the --out name with .log)
//
// Output: every finished run is appended to the results file (one JSON line, with the output of the runs that did not match), and
// everything that is printed is also appended to the log file. When the run ends or stops, the summary is written to <out>.summary.txt
// and the keys of the runs that did not match to <out>.failed.txt.
//
// Interrupting: Ctrl-C or SIGTERM stops the runs in flight (they are not recorded), restores the setting and removes the rules, lists
// and indices of the runs. Run the same command again to continue: it skips the runs that the results file records as a match, and the
// ones that differed (--rerun-differs runs those again, for example after a fix); runs that failed with an error or a timeout run again.
// If the process is killed hard (SIGKILL, power loss), <out>.state.json keeps the value of the setting from before the first run: the
// next run restores it at its end, and --restore does it at once. --fresh ignores the earlier results.
//
// Layer 1: one exception with one item, for every kind, type and operator, with every invalid value and every redefined-field mode.
// Layer 2: one exception with two items, for every pair of kinds and every pair of operators, on a few pairs of types
//          (--full-types: on pairs that cover all the types), and an invalid value in either item.
// Layer 3: lists of two and three exceptions drawn, with repetition, from a set of exceptions that each end up in a different place.

import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'esql_exceptions_try.mjs');
const KBN = process.env.KBN_URL || 'http://localhost:5601/kbn';
const ES = process.env.ES_URL || 'http://localhost:9200';
const auth =
  'Basic ' +
  Buffer.from(`${process.env.ES_USER || 'elastic'}:${process.env.ES_PASS || 'changeme'}`).toString(
    'base64'
  );
const SETTING_ID = 'securitySolution:enableEsqlRuleComputedFieldExceptions';

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [key, ...value] = a.slice(2).split('=');
      return [key, value.length ? value.join('=') : 'true'];
    })
);
const checkPrompts = args['check-prompts'] === 'true';
const layers = (args.layers ?? '1,2,3').split(',').map(Number);
const settings = { on: ['on'], off: ['off'], both: ['on', 'off'] }[args.setting ?? 'both'];
if (!settings) throw new Error('--setting must be on, off or both');
const concurrency = Number(args.concurrency ?? (checkPrompts ? 8 : 4));
const retries = Number(args.retries ?? 1);
const timeoutMs = Number(args.timeout ?? 240) * 1000;
const outFile = args.out ?? 'esql_try_matrix_results.jsonl';
const logFile = args.log ?? `${outFile.replace(/\.jsonl$/, '')}.log`;
const stateFile = `${outFile}.state.json`;
const MAX_SLOTS = 16;
if (!(concurrency >= 1 && concurrency <= MAX_SLOTS))
  throw new Error(`--concurrency must be between 1 and ${MAX_SLOTS}`);

const log = (line = '') => {
  console.log(line);
  appendFileSync(logFile, line === '' ? '\n' : `${new Date().toISOString()} ${line}\n`);
};

// The questions of the script (keep in step with askItem in esql_exceptions_try.mjs)
const KINDS = ['source', 'computed', 'redefined', 'missing'];
const TYPES = [
  'keyword',
  'text',
  'integer',
  'long',
  'unsigned_long',
  'double',
  'boolean',
  'ip',
  'version',
  'date',
  'date_nanos',
];
const OPERATORS = [
  'is',
  'is_not',
  'is_one_of',
  'is_not_one_of',
  'matches',
  'does_not_match',
  'exists',
  'does_not_exist',
];
const TYPES_WITH_INVALID_VALUE = [
  'integer',
  'long',
  'unsigned_long',
  'double',
  'boolean',
  'ip',
  'version',
  'date',
  'date_nanos',
];
const OPERATORS_WITH_VALUE = ['is', 'is_not', 'is_one_of', 'is_not_one_of'];
const TYPES_WITH_MODE = ['keyword', 'text'];

const item = (kind, type, operator, extra = {}) => ({ kind, type, operator, ...extra });
const canBeInvalid = (it) =>
  TYPES_WITH_INVALID_VALUE.includes(it.type) && OPERATORS_WITH_VALUE.includes(it.operator);
const needsMode = (it) =>
  it.kind === 'redefined' && TYPES_WITH_MODE.includes(it.type) && !it.invalid;
const describeItem = (it) =>
  `${it.kind}:${it.type}:${it.operator}${it.invalid ? ':invalid' : ''}${
    it.mode === 'shown' ? ':shown' : ''
  }`;

// With repetition and without order: [a, b, c] gives aa, ab, ac, bb, bc, cc
const combinations = (values, size, from = 0) =>
  size === 0
    ? [[]]
    : values
        .slice(from)
        .flatMap((value, i) =>
          combinations(values, size - 1, from + i).map((rest) => [value, ...rest])
        );

// Layer 1
const layer1 = () => {
  const cases = [];
  for (const kind of KINDS)
    for (const type of TYPES)
      for (const operator of OPERATORS) {
        const base = item(kind, type, operator);
        const variants = [base];
        if (needsMode(base)) variants.push({ ...base, mode: 'shown' });
        if (canBeInvalid(base)) variants.push({ ...base, invalid: true });
        for (const variant of variants) cases.push({ layer: 1, exceptions: [[variant]] });
      }
  return cases;
};

// Layer 2
const TYPE_PAIRS = [
  ['keyword', 'integer'],
  ['text', 'double'],
  ['ip', 'date'],
  ...(args['full-types']
    ? [
        ['version', 'boolean'],
        ['long', 'unsigned_long'],
        ['date_nanos', 'keyword'],
      ]
    : []),
];
const layer2 = () => {
  const cases = [];
  for (const [kindA, kindB] of combinations(KINDS, 2))
    for (const [typeA, typeB] of TYPE_PAIRS) {
      for (const [operatorA, operatorB] of combinations(OPERATORS, 2))
        cases.push({
          layer: 2,
          exceptions: [[item(kindA, typeA, operatorA), item(kindB, typeB, operatorB)]],
        });
      // An invalid value in either item, with the other item testing "is"
      for (const operator of OPERATORS_WITH_VALUE) {
        const first = item(kindA, typeA, operator, { invalid: true });
        const second = item(kindB, typeB, operator, { invalid: true });
        if (canBeInvalid(first))
          cases.push({ layer: 2, exceptions: [[first, item(kindB, typeB, 'is')]] });
        if (canBeInvalid(second))
          cases.push({ layer: 2, exceptions: [[item(kindA, typeA, 'is'), second]] });
      }
    }
  return cases;
};

// Layer 3: each exception ends up in a different place or has a different effect
const ARCHETYPES = {
  'dsl-source-is': [item('source', 'keyword', 'is')],
  'dsl-source-is-not-one-of': [item('source', 'integer', 'is_not_one_of')],
  'dsl-redefined-is': [item('redefined', 'keyword', 'is')],
  'dsl-redefined-shown-one-of': [item('redefined', 'text', 'is_one_of', { mode: 'shown' })],
  'dsl-missing-is': [item('missing', 'keyword', 'is')],
  'dsl-missing-is-not': [item('missing', 'keyword', 'is_not')],
  'end-computed-is': [item('computed', 'keyword', 'is')],
  'end-computed-is-not-one-of': [item('computed', 'integer', 'is_not_one_of')],
  'end-computed-exists': [item('computed', 'ip', 'exists')],
  'end-computed-and-source': [item('computed', 'keyword', 'is'), item('source', 'integer', 'is')],
  'end-computed-and-missing-is-not': [
    item('computed', 'keyword', 'is'),
    item('missing', 'keyword', 'is_not'),
  ],
  'skipped-computed-double': [item('computed', 'double', 'is')],
  'skipped-computed-matches-on-ip': [item('computed', 'ip', 'matches')],
  'skipped-computed-and-missing-is': [
    item('computed', 'keyword', 'is'),
    item('missing', 'keyword', 'is'),
  ],
  'fails-computed-invalid-value': [item('computed', 'integer', 'is', { invalid: true })],
};
const layer3 = () => {
  const names = Object.keys(ARCHETYPES);
  return [2, 3].flatMap((size) =>
    combinations(names, size).map((picked) => ({
      layer: 3,
      id: `3/${picked.join('+')}`,
      exceptions: picked.map((name) => ARCHETYPES[name]),
    }))
  );
};

const allCases = [
  ...(layers.includes(1) ? layer1() : []),
  ...(layers.includes(2) ? layer2() : []),
  ...(layers.includes(3) ? layer3() : []),
]
  .map((c) => ({
    ...c,
    id: c.id ?? `${c.layer}/${c.exceptions.map((ex) => ex.map(describeItem).join('&')).join('+')}`,
  }))
  .filter((c) => !args.only || c.id.includes(args.only));
const cases = allCases.slice(0, args.limit ? Number(args.limit) : undefined);

// The answers to the questions that the script asks, in order
const answersFor = (exceptions) =>
  exceptions.flatMap((items, e) => [
    ...items.flatMap((it, i) => [
      it.kind,
      it.type,
      it.operator,
      ...(canBeInvalid(it) ? [it.invalid ? 'yes' : 'no'] : []),
      ...(needsMode(it) ? [it.mode ?? 'source'] : []),
      i < items.length - 1 ? 'yes' : 'no',
    ]),
    e < exceptions.length - 1 ? 'yes' : 'no',
  ]);

if (args.list) {
  for (const layer of [1, 2, 3]) {
    const count = cases.filter((c) => c.layer === layer).length;
    if (count) console.log(`Layer ${layer}: ${count} cases`);
  }
  const runs = cases.length * (checkPrompts ? 1 : settings.length);
  console.log(
    `${cases.length} cases, ${runs} runs (about 20 seconds each, ${concurrency} at once)`
  );
  process.exit(0);
}

const control = { stopping: false };
const children = new Set();
const runScript = (c, setting, slot) =>
  new Promise((resolve) => {
    const env = checkPrompts
      ? { ...process.env, KBN_URL: 'http://127.0.0.1:1', ES_URL: 'http://127.0.0.1:1' }
      : process.env;
    const child = spawn(
      process.execPath,
      [SCRIPT, `--setting=${setting}`, ...(checkPrompts ? [] : [`--suffix=w${slot}`])],
      { env, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    children.add(child);
    let out = '';
    let err = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      clearTimeout(timer);
      children.delete(child);
      resolve({ code, out, err });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(answersFor(c.exceptions).join('\n') + '\n');
  });

const verdictOf = ({ code, out, err }) => {
  if (checkPrompts) return err.includes('fetch failed') ? 'MATCH' : 'ERROR';
  if (out.includes('This matches what to expect.')) return 'MATCH';
  if (out.includes('This DIFFERS')) return 'DIFFERS';
  return code === null ? 'TIMEOUT' : 'ERROR';
};
const keyLines = (out) =>
  out
    .split('\n')
    .filter((l) =>
      /^(  Alerts for|  The rule fails|  With the setting|Result:|Alerts created|This |Applied at|Not applied)/.test(
        l
      )
    );

const http = async (url, method = 'GET', body) => {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      'kbn-xsrf': 'x',
      'elastic-api-version': '2023-10-31',
      'x-elastic-internal-origin': 'kibana',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { status: res.status, body: text ? JSON.parse(text) : null };
  } catch {
    return { status: res.status, body: text };
  }
};

const readRecords = () =>
  existsSync(outFile)
    ? readFileSync(outFile, 'utf8')
        .split('\n')
        .filter(Boolean)
        .flatMap((line) => {
          try {
            return [JSON.parse(line)];
          } catch {
            return []; // the line that a killed process was writing
          }
        })
        .filter((r) => !r.checkPrompts === !checkPrompts)
    : [];
// The last record of each run decides: a run that is done again replaces the earlier result
const latestVerdicts = () => new Map(readRecords().map((r) => [r.key, r.verdict]));

const planned = (checkPrompts ? ['on'] : settings).flatMap((setting) =>
  cases.map((c) => ({ ...c, setting, key: `${setting}|${c.id}` }))
);

const summarize = () => {
  const verdicts = latestVerdicts();
  const counts = {};
  const notMatched = [];
  for (const job of planned) {
    const verdict = verdicts.get(job.key) ?? 'NOT RUN';
    const bucket = `layer ${job.layer}, setting ${job.setting}`;
    counts[bucket] ??= {};
    counts[bucket][verdict] = (counts[bucket][verdict] ?? 0) + 1;
    if (!['MATCH', 'NOT RUN'].includes(verdict)) notMatched.push(`${verdict}\t${job.key}`);
  }
  const lines = [
    `Summary of the results in ${outFile}`,
    ...Object.entries(counts)
      .sort()
      .map(([bucket, byVerdict]) => `  ${bucket}: ${JSON.stringify(byVerdict)}`),
  ];
  writeFileSync(`${outFile}.summary.txt`, lines.join('\n') + '\n');
  writeFileSync(`${outFile}.failed.txt`, notMatched.join('\n') + (notMatched.length ? '\n' : ''));
  return { lines, notMatched };
};

const removeLeftovers = async () => {
  for (let slot = 0; slot < MAX_SLOTS; slot++) {
    const suffix = `-w${slot}`;
    await http(`${KBN}/api/detection_engine/rules?rule_id=esql-try-rule${suffix}`, 'DELETE');
    await http(
      `${KBN}/api/exception_lists?list_id=esql-try-list${suffix}&namespace_type=single`,
      'DELETE'
    );
    await http(`${ES}/esql_try_w${slot}`, 'DELETE');
    await http(
      `${ES}/.alerts-security.alerts-*/_delete_by_query?refresh=true&conflicts=proceed`,
      'POST',
      { query: { term: { 'kibana.alert.rule.rule_id': `esql-try-rule${suffix}` } } }
    );
  }
};

const readState = () => {
  try {
    return JSON.parse(readFileSync(stateFile, 'utf8'));
  } catch {
    return undefined;
  }
};
const isAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

// Puts the stack back as it was before the first run
const restoreStack = async () => {
  const state = readState();
  if (!state) return;
  await http(`${KBN}/internal/kibana/settings`, 'POST', {
    changes: { [SETTING_ID]: state.previousSetting },
  });
  log(
    `The setting ${SETTING_ID} is back to ${
      state.previousSetting === null ? 'its default' : state.previousSetting
    }`
  );
  if (!args['no-cleanup']) {
    await removeLeftovers();
    log('The rules, exception lists, indices and alerts of the runs are removed');
  }
  rmSync(stateFile, { force: true });
};

const requireStack = async () => {
  const [es, kbn] = await Promise.all([
    http(ES).catch(() => ({})),
    http(`${KBN}/api/status`).catch(() => ({})),
  ]);
  if (es.status !== 200 || kbn.status !== 200)
    throw new Error(
      `Elasticsearch (${ES}) or Kibana (${KBN}) does not answer: start the stack first, this script never does`
    );
};

if (args.restore) {
  await requireStack();
  if (readState()) await restoreStack();
  else log(`There is nothing to restore: ${stateFile} does not exist`);
  process.exit(0);
}

// A file that was cut in the middle of a line gets a line break. The next record then does not join it
if (existsSync(outFile) && !readFileSync(outFile, 'utf8').endsWith('\n'))
  appendFileSync(outFile, '\n');

const verdicts = args.fresh ? new Map() : latestVerdicts();
const skipVerdicts = args['rerun-differs'] ? ['MATCH'] : ['MATCH', 'DIFFERS'];
const jobs = planned.filter((job) => !skipVerdicts.includes(verdicts.get(job.key)));
log(
  `Run of ${planned.length} runs (${cases.length} cases${
    checkPrompts ? ', prompts only' : `, settings ${settings.join(' and ')}`
  }), concurrency ${concurrency}, results in ${outFile}`
);
log(
  `${planned.length - jobs.length} runs are already recorded and skipped, ${jobs.length} to do${
    planned.length > jobs.length ? ' (resuming)' : ''
  }`
);

const stop = (signal) => {
  if (control.stopping) {
    log(
      `${signal} again: leaving now. ${stateFile} keeps the setting to restore (run with --restore)`
    );
    process.exit(130);
  }
  control.stopping = true;
  log(
    `${signal}: no new run starts, the ${children.size} in flight are stopped and not recorded, then the stack is restored`
  );
  for (const child of children) child.kill('SIGTERM');
};
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => stop(signal));

let finished = 0;
let ownsState = false;
const runJob = async (job, slot) => {
  const started = Date.now();
  let result;
  let attempts = 0;
  do {
    attempts++;
    result = await runScript(job, job.setting, slot);
  } while (
    verdictOf(result) !== 'MATCH' &&
    attempts <= retries &&
    !checkPrompts &&
    !control.stopping
  );
  if (control.stopping) return;
  const verdict = verdictOf(result);
  const record = {
    key: job.key,
    id: job.id,
    layer: job.layer,
    setting: job.setting,
    verdict,
    attempts,
    checkPrompts,
    seconds: Math.round((Date.now() - started) / 1000),
    ...(verdict === 'MATCH' && !checkPrompts
      ? { summary: keyLines(result.out) }
      : { output: (result.out + result.err).slice(-6000) }),
  };
  appendFileSync(outFile, JSON.stringify(record) + '\n');
  finished++;
  log(
    `[${finished}/${jobs.length}] ${verdict.padEnd(7)} ${job.setting} ${job.id}${
      attempts > 1 ? ` (${attempts} attempts)` : ''
    }`
  );
};

try {
  if (jobs.length > 0 && !checkPrompts) {
    await requireStack();
    const state = readState();
    if (state && isAlive(state.pid) && state.pid !== process.pid)
      throw new Error(`Another run (pid ${state.pid}) is using ${stateFile}`);
    if (state)
      log(
        `An earlier run stopped before it restored the setting: it goes back to ${JSON.stringify(
          state.previousSetting
        )}`
      );
    const current = (await http(`${KBN}/internal/kibana/settings`)).body?.settings?.[SETTING_ID]
      ?.userValue;
    writeFileSync(
      stateFile,
      JSON.stringify({
        pid: process.pid,
        previousSetting: state ? state.previousSetting : current ?? null,
        startedAt: new Date(),
      })
    );
    ownsState = true;
  }
  // All the runs of one setting go first, because the setting is global
  for (const setting of checkPrompts ? ['on'] : settings) {
    const batch = jobs.filter((j) => j.setting === setting);
    let next = 0;
    await Promise.all(
      Array.from({ length: batch.length ? concurrency : 0 }, async (_, slot) => {
        while (next < batch.length && !control.stopping) await runJob(batch[next++], slot);
      })
    );
  }
} finally {
  if (ownsState) await restoreStack();
  const { lines, notMatched } = summarize();
  log();
  lines.forEach((line) => log(line));
  if (control.stopping) log('\nThe run was interrupted: run the same command again to continue.');
  else if (notMatched.length)
    log(
      `\n${notMatched.length} runs did not match. Their output is in ${outFile}; the keys are in ${outFile}.failed.txt`
    );
  else if (!lines.some((line) => line.includes('NOT RUN')))
    log('\nEvery run matched what the script predicts.');
  if (notMatched.length) process.exitCode = 1;
  if (control.stopping) process.exitCode = 130;
}
