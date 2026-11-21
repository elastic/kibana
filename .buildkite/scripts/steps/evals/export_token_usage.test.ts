/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'child_process';
import Fs from 'fs';
import Os from 'os';
import Path from 'path';

const SCRIPT = Path.join(__dirname, 'run_suite.sh');

type Scenario = 'ok' | 'missing' | 'shardfail' | 'scrollfail' | 'budget' | 'nobudget';

// Sources only the token usage functions from run_suite.sh and replaces es_curl with a stub that
// records every request and answers according to the scenario.
const HARNESS = String.raw`
set -u
cd "$WORK"
mkdir -p .scout/servers bin
echo '{"hosts":{"elasticsearch":"https://u:p@es.example:9200/"}}' > .scout/servers/local.json
printf '#!/bin/sh\necho "UPLOAD $*" >> "$CALLS"\n' > bin/buildkite-agent
chmod +x bin/buildkite-agent
export PATH="$PWD/bin:$PATH" EVAL_SUITE_ID=suite EVAL_PROJECT=proj
awk '/^token_usage_es\(\) \{/,/^}/' "$SCRIPT" > fn.sh
awk '/^export_token_usage\(\) \{/,/^}/' "$SCRIPT" >> fn.sh

es_curl() {
  local url='' method=GET a
  for a in "$@"; do case "$a" in http*) url="$a";; esac; done
  [[ " $* " == *" -X POST "* ]] && method=POST
  [[ " $* " == *" -X DELETE "* ]] && method=DELETE
  [[ "$url" == */_search/scroll && " $* " != *" -X DELETE "* ]] && method=SCROLL
  echo "$method $(echo "$url" | sed 's/.*9200//')" >> "$CALLS"
  local n; n=$(grep -c '^SCROLL' "$CALLS")
  case "$method" in
    POST) printf '{"_shards":{"failed":0}}\n200';;
    DELETE) printf '{}\n200';;
    GET)
      case "$SCENARIO" in
        missing) printf '{"error":{"type":"index_not_found_exception"}}\n404';;
        shardfail) printf '{"_scroll_id":"S1","_shards":{"failed":1},"hits":{"hits":[{"_source":{"model":{"model_id":"m"}}}]}}\n200';;
        *) printf '{"_scroll_id":"S1","_shards":{"failed":0},"hits":{"hits":[{"_source":{"model":{"model_id":"m1"}}}]}}\n200';;
      esac;;
    SCROLL)
      case "$SCENARIO" in
        scrollfail) printf '{"error":"boom"}\n500';;
        *) if (( n == 1 )); then
             printf '{"_scroll_id":"S2","_shards":{"failed":0},"hits":{"hits":[{"_source":{"model":{"model_id":"m2"}}}]}}\n200'
           else
             printf '{"_scroll_id":"S2","_shards":{"failed":0},"hits":{"hits":[]}}\n200'
           fi;;
      esac;;
  esac
}

# shellcheck disable=SC1091
source ./fn.sh
[[ "$SCENARIO" == budget ]] && export TOKEN_USAGE_EXPORT_BUDGET_SECONDS=0
[[ "$SCENARIO" == nobudget ]] && export TOKEN_USAGE_EXPORT_BUDGET_SECONDS=0 TOKEN_USAGE_UPLOAD_BUDGET_SECONDS=0
export_token_usage
exit $?
`;

const run = (scenario: Scenario) => {
  const work = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'token-usage-'));
  const calls = Path.join(work, 'calls.log');
  Fs.writeFileSync(calls, '');
  try {
    const result = spawnSync('bash', ['-c', HARNESS], {
      env: {
        PATH: process.env.PATH,
        WORK: work,
        CALLS: calls,
        SCRIPT,
        SCENARIO: scenario,
      },
      encoding: 'utf-8',
    });
    const artifactDir = Path.join(work, 'target', 'token_usage');
    const artifact = Fs.existsSync(artifactDir)
      ? Fs.readdirSync(artifactDir)
          .map((file) => Fs.readFileSync(Path.join(artifactDir, file), 'utf-8'))
          .join('')
      : '';
    return {
      status: result.status,
      output: `${result.stdout}${result.stderr}`,
      calls: Fs.readFileSync(calls, 'utf-8').split('\n').filter(Boolean),
      docs: artifact.split('\n').filter(Boolean).length,
    };
  } finally {
    Fs.rmSync(work, { recursive: true, force: true });
  }
};

describe('export_token_usage', () => {
  it('refreshes the index before reading it, then pages and clears the scroll', () => {
    const { status, calls, docs } = run('ok');

    expect(status).toBe(0);
    expect(calls[0]).toMatch(/^POST .*_refresh\?expand_wildcards=all$/);
    expect(calls[1]).toMatch(/^GET .*_search\?scroll=/);
    expect(calls.filter((call) => call.startsWith('SCROLL'))).toHaveLength(2);
    expect(calls).toContain('DELETE /_search/scroll');
    expect(docs).toBe(2);
  });

  it('treats a missing index as nothing written, without a warning', () => {
    const { status, output, docs } = run('missing');

    expect(status).toBe(0);
    expect(output).toContain('nothing to upload');
    expect(output).not.toMatch(/incomplete|failed/i);
    expect(docs).toBe(0);
  });

  it('reports a search with failed shards as incomplete instead of an empty export', () => {
    const { status, output, calls } = run('shardfail');

    expect(status).toBe(0);
    expect(output).toMatch(/export failed .*incomplete/);
    expect(calls).toContain('DELETE /_search/scroll');
  });

  it('flags a partial export when a later page fails and still clears the scroll', () => {
    const { status, output, calls, docs } = run('scrollfail');

    expect(status).toBe(0);
    expect(output).toMatch(/export failed \(HTTP 500\)/);
    expect(output).toContain('INCOMPLETE');
    expect(docs).toBe(1);
    expect(calls).toContain('DELETE /_search/scroll');
  });

  it('stops at the time budget and flags the export as incomplete', () => {
    const { status, output } = run('budget');

    expect(status).toBe(0);
    expect(output).toContain('time budget');
  });

  it('still uploads the pages collected when the scan budget runs out', () => {
    const { calls, docs, output } = run('budget');

    expect(docs).toBe(1);
    expect(output).toContain('INCOMPLETE');
    expect(calls.some((call) => call.startsWith('UPLOAD'))).toBe(true);
  });

  it('counts the scroll cleanup against the scan budget', () => {
    const { calls } = run('budget');

    expect(calls.some((call) => call.startsWith('DELETE'))).toBe(false);
  });

  it('skips the upload only when the upload budget is spent too', () => {
    const { calls, output } = run('nobudget');

    expect(output).toContain('before the upload');
    expect(calls.some((call) => call.startsWith('UPLOAD'))).toBe(false);
  });

  it('exports after the triage data is written and before cleanup stops ES', () => {
    const onExit = Fs.readFileSync(SCRIPT, 'utf-8').match(/^on_exit\(\) \{[\s\S]*?^}/m)?.[0] ?? '';
    const at = (needle: string) => onExit.indexOf(needle);

    expect(at('du -sh .es')).toBeGreaterThan(-1);
    expect(at('du -sh .es')).toBeLessThan(at('record_suite_failure "$exit_status"'));
    expect(at('record_suite_failure "$exit_status"')).toBeLessThan(at('export_token_usage ||'));
    expect(at('export_token_usage ||')).toBeLessThan(at('\n  cleanup\n'));
  });

  it('never prints the Elasticsearch credentials', () => {
    (['ok', 'shardfail', 'scrollfail', 'budget'] as Scenario[]).forEach((scenario) => {
      expect(run(scenario).output).not.toMatch(/u:p@/);
    });
  });
});
