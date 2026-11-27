#!/usr/bin/env bash

# Sourced by run_suite.sh (and its test). Prints the Scout serverConfigSet for an eval run:
#   1. an explicit EVAL_SERVER_CONFIG_SET override, else
#   2. the suite's `serverConfigSet` from the suite info JSON (the on-demand pipeline doesn't forward it), else
#   3. `evals_tracing`, the default stack.
# Usage: resolve_server_config_set "<suite info JSON>"
resolve_server_config_set() {
  local suite_info="${1:-}"
  local from_suite=""
  if [[ -z "${EVAL_SERVER_CONFIG_SET:-}" ]]; then
    from_suite="$(printf '%s' "$suite_info" | jq -r '.serverConfigSet // empty' 2>/dev/null || true)"
  fi
  printf '%s' "${EVAL_SERVER_CONFIG_SET:-${from_suite:-evals_tracing}}"
}
