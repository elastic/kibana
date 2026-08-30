#!/bin/bash
# run_model.sh — minimal, proven path for EIS models
# Mirrors the successful Haiku canary exactly:
#   stop → clean data → evals start (manages scout+CCM+readiness internally) → export
set -uo pipefail

MODEL="$1"
export NVM_DIR=$HOME/.nvm; source $NVM_DIR/nvm.sh
# Golden-cluster trace export: source golden env so the vault config below can
# point tracingEs/tracingExporters at golden (profileEnvOverrides come from the
# config file only — ambient env is NOT read by evals start).
source /tmp/golden-cluster-env.sh 2>/dev/null || true
cd ~/Projects/kibana

# ─── Write config.local.json (git-ignored, missing on fresh VMs) ────────────
python3 -c "
import json, os
path = 'x-pack/platform/packages/shared/kbn-evals/scripts/vault/config.local.json'
os.makedirs(os.path.dirname(path), exist_ok=True)
cfg = {}
if os.path.exists(path):
    with open(path) as f:
        try:
            cfg = json.load(f)
        except Exception:
            cfg = {}
cfg['description'] = 'kbn-evals local config'
cfg['environment'] = 'local'
cfg['evaluationsKbn'] = {'url': 'http://elastic:changeme@localhost:5620', 'apiKey': ''}
cfg['evaluationsEs'] = {'url': 'http://elastic:changeme@localhost:9220', 'apiKey': ''}
# Golden-cluster trace export: EDOT + scout OTel exporters must send traces to
# the golden cluster (profileEnvOverrides are read from this file, NOT ambient env).
import os as _os
_golden_es = _os.environ.get('GOLDEN_ES_URL', '')
_golden_key = _os.environ.get('GOLDEN_ES_API_KEY', '')
_trace_exporters = _os.environ.get('TRACING_EXPORTERS', '')
if _golden_es:
    cfg['tracingEs'] = {'url': _golden_es, 'apiKey': _golden_key}
    if _trace_exporters:
        try:
            cfg['tracingExporters'] = json.loads(_trace_exporters)
        except Exception:
            pass
else:
    cfg['tracingEs'] = {'url': 'http://elastic:changeme@localhost:9220', 'apiKey': ''}
with open(path, 'w') as f:
    json.dump(cfg, f, indent=2)
print('config.local.json written (tracingEs -> %s)' % ('golden' if _golden_es else 'local'))
"""

# ─── Env vars ────────────────────────────────────────────────────────────────
source /tmp/golden-cluster-env.sh 2>/dev/null
# Judge independence. The matrix drops self-judged docs (`excludeSelfJudged`),
# so a model graded by itself scores a whole row of blanks that look identical
# to "never ran" — 4.6-sonnet lost 294 valid docs this way on 2026-08-29.
# Pick a default judge that differs from the model under test, and let the
# caller override. DEFAULT_JUDGE is only used when it is not the candidate.
DEFAULT_JUDGE=eis-anthropic-claude-4-6-sonnet
ALT_JUDGE=eis-anthropic-claude-4-5-haiku
if [ -z "${EVAL_CONNECTOR_ID:-}" ]; then
  if [ "$MODEL" = "$DEFAULT_JUDGE" ]; then
    export EVAL_CONNECTOR_ID="$ALT_JUDGE"
  else
    export EVAL_CONNECTOR_ID="$DEFAULT_JUDGE"
  fi
fi
if [ "$EVAL_CONNECTOR_ID" = "$MODEL" ]; then
  echo "FATAL: judge ($EVAL_CONNECTOR_ID) == model under test ($MODEL);" >&2
  echo "       every score would be dropped as self-judged. Set EVAL_CONNECTOR_ID." >&2
  exit 2
fi
echo "=== judge: $EVAL_CONNECTOR_ID | candidate: $MODEL ==="

# kbn-evals ships HTTP retries off (KBN_EVALS_HTTP_RETRIES defaults to 0), so a
# single blip on the converse call ends the whole suite: glm-5-2 lost 19 of 21
# examples 58 minutes in when Kibana stopped answering on 2026-08-29. Retries
# only cover 429/503/504, so this does not save a status-less transport death,
# but it does absorb the overload responses a long sweep actually provokes.
export KBN_EVALS_HTTP_RETRIES="${KBN_EVALS_HTTP_RETRIES:-3}"
# Retries only help a request that FAILS. A converse call that never returns
# parks the worker forever: a glm-5-2 run burned 45 minutes with 4 seconds of
# CPU and six open sockets while /api/status still answered 200. Bound each
# attempt so a hung endpoint becomes a retryable failure.
#
# 25 min, not 10: golden shows a LEGITIMATE glm-5-2 example taking 1198s
# (20 min). A 10-min bound aborts real work and the retry aborts it again,
# turning a slow success into a guaranteed failure. Keep this above the
# measured worst case -- the suite-level budget catches a truly wedged run.
export KBN_EVALS_HTTP_TIMEOUT_MS="${KBN_EVALS_HTTP_TIMEOUT_MS:-1500000}"
export EVAL_REPETITIONS="${EVAL_REPETITIONS:-1}"
export PERSONA_MATRIX_TIMEOUT_MINUTES="${PERSONA_MATRIX_TIMEOUT_MINUTES:-30}"
export AGENT_BUILDER_INFERENCE_TIMEOUT_MS=600000
export SCOUT_READY_TIMEOUT_MS=900000
CCM_KEY=$(python3 -c "import json; d=json.load(open('/home/orcaeval/.elastic/eis-ccm-key.json')); print(d.get('api_key','') or d.get('key',''))")
export KIBANA_EIS_CCM_API_KEY=$CCM_KEY
CONNS=$(python3 -c "import json,base64; c=json.load(open('/home/orcaeval/.elastic/eis-connectors-cache.json')); conns=c.get('connectors',c); print(base64.b64encode(json.dumps(conns).encode()).decode())")
export KIBANA_TESTING_AI_CONNECTORS=$CONNS

# ─── Full stop + clean data ──────────────────────────────────────────────────
echo "=== Stopping any prior stack ==="
node scripts/evals stop 2>/dev/null || true
pkill -f "scout.js" 2>/dev/null || true
pkill -f "kibana --dev" 2>/dev/null || true
pkill -f "org.elasticsearch.bootstrap.Elasticsearch" 2>/dev/null || true
sleep 5

echo "=== Cleaning ES data ==="
rm -rf ~/Projects/kibana/.es/cluster-scout/data 2>/dev/null
echo "ES data cleaned"

# ─── Run eval — evals start manages scout boot, CCM, readiness internally ────
# This is the exact path that passed 21/21 for Haiku. No manual scout, no
# manual CCM, no --skip-server: a single command owns the whole lifecycle.
echo "=== Running eval: $MODEL ==="
node scripts/evals start --profile local --suite security-persona-matrix --model "$MODEL" 2>&1 | tail -40
EVAL_EXIT=${PIPESTATUS[0]}
echo "EVAL_EXIT=$EVAL_EXIT"

# ─── Export scores to golden cluster ────────────────────────────────────────
echo "=== Exporting scores to golden ==="
source /tmp/golden-cluster-env.sh 2>/dev/null
python3 /tmp/export_scores.py "$MODEL" 2>&1
EXPORT_EXIT=$?

echo "=== DONE: $MODEL (EVAL_EXIT=$EVAL_EXIT, EXPORT_EXIT=$EXPORT_EXIT) ==="

# Propagate eval failure as the process exit code so the sweep controller's
# ssh rc reflects it (export still runs above either way; the controller
# treats rc and the golden doc count as the two independent gates.

exit $EVAL_EXIT
