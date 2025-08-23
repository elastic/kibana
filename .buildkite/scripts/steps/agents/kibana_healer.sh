#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

# 1. check failed steps -> early exit if not in list
# 2. setup gemini cli
#   2a. sandbox/devcontainer
#   2b. instructions/mcp
#   2c. tail gemini logs
# 3. iterate through failures
#   3a. create fix
#   3b. test changes -> rerun failed step
#   3c. if passes create commit else reset changes
# 4. push changes if needed
# 5. upload logs
# 6. exit based on fix status




echo "--- Configuring Agent"
GEMINI_API_KEY="$(vault_get kibana-healer gemini)"
export GEMINI_API_KEY


exit 0
