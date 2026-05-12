#!/usr/bin/env bash
# Shim: sources the shared Kibana API utilities.
REPO_ROOT="$(git rev-parse --show-toplevel)"
source "$REPO_ROOT/scripts/kibana_api_common.sh"
