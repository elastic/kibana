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
    # Agent Builder spans (the ones trace-based evaluators query) do NOT flow
    # through telemetry.tracing.exporters. register_tracing.ts builds its own
    # provider, hard-wired to ElasticsearchOtlpExporter(asInternalUser) -> the
    # LOCAL Scout ES. Before golden was introduced, tracingEs also pointed local,
    # so export and query agreed and evaluators worked. Pointing tracingEs at
    # golden moved the QUERY target only: spans kept landing in local Scout, so
    # every trace_id lookup missed (0/200 Sept-2 score trace_ids on golden).
    # xpack.agentBuilder.tracing.exporters is APPENDED to the built-in local
    # exporter, so this adds golden without removing local fidelity.
    # The scores-only key returns HTTP 200 with a FORBIDDEN payload buried in the
    # OTLP protobuf body, so a wrong key here drops every span SILENTLY. Prefer the
    # trace-capable key and fail loudly rather than export into a black hole.
    _trace_key = _os.environ.get('GOLDEN_TRACE_API_KEY', '') or _golden_key
    if _trace_key:
        cfg['agentBuilderTracingExporters'] = [{
            'url': _golden_es.rstrip('/') + '/_otlp/v1/traces',
            'headers': {'Authorization': 'ApiKey ' + _trace_key},
        }]
else:
    cfg['tracingEs'] = {'url': 'http://elastic:changeme@localhost:9220', 'apiKey': ''}
with open(path, 'w') as f:
    json.dump(cfg, f, indent=2)
print('config.local.json written (tracingEs -> %s)' % ('golden' if _golden_es else 'local'))
"""

# ─── Trace-export preflight ──────────────────────────────────────────────────
# The OTLP endpoint answers HTTP 200 even when the API key lacks traces-* write:
# the rejection is a FORBIDDEN string inside the protobuf response body. Without
# this check a whole sweep runs, looks green, and lands zero spans on golden.
if [ -n "${GOLDEN_ES_URL:-}" ]; then
  _pf_key="${GOLDEN_TRACE_API_KEY:-${GOLDEN_ES_API_KEY:-}}"
  if [ -n "$_pf_key" ]; then
    # Must send a REAL span: an empty OTLP body never reaches the index, so a
    # key without traces-* write still answers 200 and the check passes vacuously.
    _pf_body=$(_PF_KEY="$_pf_key" python3 -c "
import os,random,sys,time,urllib.request,urllib.error
def tag(f,w): return bytes([(f<<3)|w])
def varint(n):
    o=b''
    while True:
        b=n&0x7F; n>>=7; o+=bytes([b|(0x80 if n else 0)])
        if not n: return o
def ld(f,p): return tag(f,2)+varint(len(p))+p
def s(f,t): return ld(f,t.encode())
def fx(f,n): return tag(f,1)+n.to_bytes(8,'little')
def kv(k,v): return ld(1,s(1,k)+ld(2,s(1,v)))
now=time.time_ns()
span=(ld(1,bytes(random.getrandbits(8) for _ in range(16)))+ld(2,bytes(random.getrandbits(8) for _ in range(8)))
      +s(5,'trace-export-preflight')+tag(6,0)+varint(2)+fx(7,now)+fx(8,now+1000))
req=ld(1,ld(1,ld(1,kv('service.name','preflight')))+ld(2,ld(2,span)))
r=urllib.request.Request(os.environ['GOLDEN_ES_URL'].rstrip('/')+'/_otlp/v1/traces',data=req,
  headers={'Authorization':'ApiKey '+os.environ['_PF_KEY'],'Content-Type':'application/x-protobuf'},method='POST')
try:
    with urllib.request.urlopen(r,timeout=45) as resp: sys.stdout.write(resp.read().decode('utf-8','replace'))
except urllib.error.HTTPError as e: sys.stdout.write('HTTPERROR '+e.read().decode('utf-8','replace'))
except Exception as e: sys.stdout.write('PREFLIGHT_SKIP '+str(e))
" 2>/dev/null _PF_KEY="$_pf_key" || true)
    case "$_pf_body" in
      *FORBIDDEN*|*unauthorized*)
        echo "FATAL: golden trace export key cannot write traces-* (silent 200/FORBIDDEN)." >&2
        echo "       Set GOLDEN_TRACE_API_KEY to a key with traces-* write privileges." >&2
        exit 1 ;;
    esac
    echo "trace-export preflight OK (golden accepted a real OTLP span)"
  fi
fi

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
export PERSONA_MATRIX_TIMEOUT_MINUTES="${PERSONA_MATRIX_TIMEOUT_MINUTES:-120}"
export AGENT_BUILDER_INFERENCE_TIMEOUT_MS=600000
export SCOUT_READY_TIMEOUT_MS=900000
CCM_KEY=$(python3 -c "import json; d=json.load(open('/home/orcaeval/.elastic/eis-ccm-key.json')); print(d.get('api_key','') or d.get('key',''))")
export KIBANA_EIS_CCM_API_KEY=$CCM_KEY
CONNS=$(python3 -c "import json,base64; c=json.load(open('/home/orcaeval/.elastic/eis-connectors-cache.json')); conns=c.get('connectors',c); print(base64.b64encode(json.dumps(conns).encode()).decode())")

# ─── OpenRouter path (models named openrouter-*) ────────────────────────────
# The connector cache's providerConfig.url is must-point-at-proxy for
# openrouter-* connectors: they need an ES inference endpoint pointing at
# the on-VM SSE-normalizing proxy (localhost:8088), never openrouter.ai
# directly — ES cannot parse OpenRouter's raw SSE (reasoning:null in finish
# chunks → XContentParse exception → 500s). The proxy also injects max_tokens
# and retries 503s.
# Stale markers from a previous invocation would kill the endpoint watcher
# loop below and confuse the sweep controller — clear BEFORE starting it.
rm -f /tmp/unit.done /tmp/unit.rc
OR_PROXY_PORT=8088
if [ "${MODEL#openrouter-}" != "$MODEL" ]; then
  echo "=== OpenRouter model detected: $MODEL ==="
  # Proxy must be running BEFORE the endpoint references it and before any
  # converse call. Kill a stale process first: scp overwrites the file, but
  # the old process keeps serving OLD normalization rules (field-tested trap).
  kill -9 $(lsof -t -i:$OR_PROXY_PORT 2>/dev/null) 2>/dev/null || true
  nohup python3 /tmp/openrouter_proxy.py --port $OR_PROXY_PORT > /tmp/or-proxy.log 2>&1 &
  for i in $(seq 1 30); do
    # GET yields 501 (handler is POST-only); any HTTP answer = alive.
    CODE=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$OR_PROXY_PORT/ 2>/dev/null)
    [ "$CODE" != "000" ] && break
    sleep 1
  done
  echo "proxy ready (HTTP $CODE)"

  # Rewrite this model's providerConfig to point at the on-VM proxy. The key
  # stays from the cache; the URL changes. The ES endpoint's model_id must be
  # the OpenRouter API name (z-ai/glm-5.3-flash), which the cache does NOT
  # carry — read it from the matrix config's matchIds. Judge connectors are
  # untouched — they ride EIS as usual.
  CONNS=$(OPENROUTER_MODEL="$MODEL" OR_PORT=$OR_PROXY_PORT \
    MATRIX_CONFIG=/tmp/persona_matrix.config.json \
    python3 -c "
import json, base64, os, sys
raw = os.environ.get('KIBANA_TESTING_AI_CONNECTORS_B64', '')
if not raw:
    # re-derive from the CONNS captured above when the env var is unset
    raw = base64.b64encode(json.dumps(json.load(open('/home/orcaeval/.elastic/eis-connectors-cache.json')).get('connectors', {})).encode()).decode()
conns = json.loads(base64.b64decode(raw))
model = os.environ['OPENROUTER_MODEL']
c = conns.get(model)
if c is None:
    print(f'FATAL: connector {model} missing from cache', file=sys.stderr); sys.exit(3)
pc = c.setdefault('config', {}).setdefault('providerConfig', {})
pc['url'] = f\"http://127.0.0.1:{os.environ['OR_PORT']}\"
# ES endpoint model_id = OpenRouter API name from the matrix config matchIds.
# Scoped to THIS model's entry: a bare first-match regex picks up another
# model's matchIds (anthropic's is first in the file) and sends the endpoint
# at the wrong upstream model.
for _m in json.load(open(os.environ['MATRIX_CONFIG'])).get('models', []):
    if _m.get('id') == model and _m.get('matchIds'):
        pc['model_id'] = _m['matchIds'][0]
print(base64.b64encode(json.dumps(conns).encode()).decode())
" 2>/dev/null) || { echo "FATAL: connector rewrite failed" >&2; exit 3; }
  export KIBANA_TESTING_AI_CONNECTORS="$CONNS"

  # The ES inference endpoint must exist and point at the proxy, with id ==
  # connector inferenceId. Run AFTER stack boot below? No — the stack boots
  # inside `evals start`, so we cannot wait for ES here; the endpoint script
  # polls ES readiness itself (up to 10 min) in the background.
  OR_MODEL_ID=$(python3 -c "
import json, base64
c = json.loads(base64.b64decode('$CONNS'))
cfg = c['$MODEL']['config']
print(cfg['providerConfig']['model_id'])")
  # converse resolves the model by CONNECTOR id — "No connector or inference
  # endpoint found for ID 'openrouter-zai-glm-5-3-flash'" if the endpoint id
  # is the inferenceId (openrouter-glm-5-3-flash-chat_completion). EIS models
  # work because CCM auto-creates endpoints named exactly after the connector.
  OR_ENDPOINT_ID="$MODEL"
  OR_KEY=$(python3 -c "
import json, base64
c = json.loads(base64.b64decode('$CONNS'))
print(c['$MODEL']['config']['providerConfig']['api_key'])")
  echo "endpoint: $OR_ENDPOINT_ID | model: $OR_MODEL_ID"
  # nohup: `evals start` blocks; the watcher creates the endpoint the moment
  # ES accepts connections, which is well before Playwright needs it.
  # LOOP: the eval retry loop wipes ES data between attempts (rm -rf), which
  # deletes the inference endpoint. A one-shot watcher leaves attempts 2/3
  # with no endpoint → converse 404. Loop until /tmp/unit.done, re-creating
  # the endpoint idempotently (create_openrouter_endpoint.py reuses an
  # endpoint that already points at the proxy, so each iteration is a no-op
  # once the endpoint exists).
  nohup bash -c '
    while [ ! -f /tmp/unit.done ]; do
      python3 /tmp/create_openrouter_endpoint.py "$1" "$2" "$3" "$4" >> /tmp/or-endpoint.log 2>&1
      sleep 10
    done
  ' _ "$OR_ENDPOINT_ID" "$OR_MODEL_ID" "$OR_KEY" $OR_PROXY_PORT \
    > /dev/null 2>&1 &
  echo "endpoint watcher started (log: /tmp/or-endpoint.log)"
fi
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
# Suite is injected by the sweeper (EVAL_SUITE); default keeps the historical
# persona-matrix behaviour for any caller that predates the suite port.
#
# CCM boot race: `evals start` waits for the .inference index, then enables
# Cloud Connected Mode against localhost:9220. Under concurrent provisioning
# (8-way, 2026-09-02) ES was not yet accepting connections for 5/15 VMs and
# the step died with "TypeError: fetch failed" ->
# "enable_eis_ccm exited with code 1" -> EVAL_EXIT=1 and nothing to export.
# The single-VM canary never hit it. It is a transient readiness fault, so
# retry the whole step; a genuine failure (bad model, real eval failure)
# fails identically on every attempt and still surfaces.
run_eval() {
  # Trace-evaluator query target as AMBIENT env (belt-and-braces): the vault
  # config.local.json also sets it via profileEnvOverrides, but on the 2026-09-04
  # 17-model sweep that propagation silently failed on 14/17 VMs -- the
  # Playwright worker fell back to the local scout esClient, whose limited
  # privileges cannot see the hidden .ds-traces-* backing indices, and every
  # trace evaluator errored with `Unknown column [trace.id]` (0/17 examples on
  # all 5 trace metrics). Ambient env is read directly by evaluate.ts:477.
  export TRACING_ES_URL="${GOLDEN_ES_URL:?GOLDEN_ES_URL required}"
  export TRACING_ES_API_KEY="${GOLDEN_ES_API_KEY:?GOLDEN_ES_API_KEY required}"
  echo "trace evaluators will query: $TRACING_ES_URL"
  node scripts/evals start --profile local --suite "${EVAL_SUITE:-security-persona-matrix}" --model "$MODEL" 2>&1 | tee /tmp/evals-start.log | tail -40
  return ${PIPESTATUS[0]}
}

EVAL_EXIT=1
for attempt in 1 2 3; do
  echo "--- eval attempt $attempt/3 ---"
  run_eval
  EVAL_EXIT=$?
  [ "$EVAL_EXIT" -eq 0 ] && break
  if [ "$attempt" -lt 3 ]; then
    echo "eval attempt $attempt failed (exit $EVAL_EXIT); stopping stack and retrying"
    node scripts/evals stop 2>/dev/null || true
    pkill -f "scout.js" 2>/dev/null || true
    pkill -f "org.elasticsearch.bootstrap.Elasticsearch" 2>/dev/null || true
    sleep $((attempt * 30))
    rm -rf ~/Projects/kibana/.es/cluster-scout/data 2>/dev/null
  fi
done
echo "EVAL_EXIT=$EVAL_EXIT"

# ─── Export scores to golden cluster ────────────────────────────────────────
echo "=== Exporting scores to golden ==="
source /tmp/golden-cluster-env.sh 2>/dev/null
EVAL_SUITE="${EVAL_SUITE:-security-persona-matrix}" python3 /tmp/export_scores.py "$MODEL" 2>&1
EXPORT_EXIT=$?

# export_scores.py exits 2 when SOME documents landed and some did not. That is
# not a success: golden holds a partial picture, and a controller reading only
# "did it exit 0" would call the sweep complete while cells are silently
# missing. Surface it distinctly from a total failure (1).
if [ "$EXPORT_EXIT" -eq 2 ]; then
  echo "EXPORT_PARTIAL=1 — some docs landed on golden, some failed; see stderr above"
fi

echo "=== DONE: $MODEL (EVAL_EXIT=$EVAL_EXIT, EXPORT_EXIT=$EXPORT_EXIT) ==="

# Propagate eval failure as the process exit code so the sweep controller's
# ssh rc reflects it (export still runs above either way; the controller
# treats rc and the golden doc count as the two independent gates.

# Detached mode: the controller launches us under nohup and polls these
# markers over short-lived SSH connections — a dead controller SSH stream
# must never look like a dead eval.
echo "$EVAL_EXIT" > /tmp/unit.rc
touch /tmp/unit.done

exit $EVAL_EXIT
