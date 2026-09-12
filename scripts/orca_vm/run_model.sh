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
export EVAL_CONNECTOR_ID=eis-anthropic-claude-4-6-sonnet
export EVAL_REPETITIONS=1
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
python3 /tmp/export_scores.py 2>&1
EXPORT_EXIT=$?

echo "=== DONE: $MODEL (EVAL_EXIT=$EVAL_EXIT, EXPORT_EXIT=$EXPORT_EXIT) ==="
