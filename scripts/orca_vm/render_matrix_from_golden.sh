#!/bin/zsh
# Drive the PR #285833 matrix pipeline end-to-end from the golden cluster.
#
#   source ~/.elastic/golden-cluster-env.sh
#   ./render_matrix_from_golden.sh [since=2026-09-01] [out=~/persona-sweep/matrix]
#
# Stages (all PR-owned components, no ad-hoc renderers):
#   1. extract_golden_aggregate.ts  -> aggregated JSON (scores, policy-stamped)
#   2. build_trace_cache.py         -> TRACES_JSON (transcripts + steps)
#   3. render_from_golden.ts        -> the published matrix HTML
# Requires Node v24.21.0 (nvm use 24.21.0).
set -euo pipefail

SINCE="${1:-2026-09-01}"
OUT="${2:-$HOME/persona-sweep/matrix}"
PKG=~/Projects/kibana.worktrees/evals-ext-matrix/x-pack/platform/packages/shared/kbn-evals-extensions
ORCA=~/Projects/kibana.worktrees/evals-ext-matrix/scripts/orca_vm

source ~/.nvm/nvm.sh
nvm use 24.21.0 >/dev/null
: "${GOLDEN_ES_URL:?source ~/.elastic/golden-cluster-env.sh first}"
: "${GOLDEN_ES_API_KEY:?}"

mkdir -p "$OUT"

echo "== 1/3 extract aggregate (since $SINCE) =="
( cd "$PKG" && SINCE="$SINCE" OUT_JSON="$OUT/aggregated.json" \
  node --require ../../../../../src/setup_node_env scripts/extract_golden_aggregate.ts )

echo "== 2/3 trace cache (340h window) =="
( cd "$ORCA" && python3 build_trace_cache.py --hours 340 --out "$OUT/trace_cache.json" )

echo "== 3/3 render matrix =="
( cd "$PKG" && AGGREGATED_JSON="$OUT/aggregated.json" \
  MATRIX_CONFIG="$PKG/config/security_matrix_persona.json" \
  TRACES_JSON="$OUT/trace_cache.json" \
  OUT_DIR="$OUT" \
  COMMIT_SHA="$(git -C ~/Projects/kibana.worktrees/evals-ext-matrix rev-parse HEAD)" \
  node --require ../../../../../src/setup_node_env scripts/render_from_golden.ts )

echo "done -> $OUT"
