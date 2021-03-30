#!/usr/bin/env bash

set -euo pipefail

node "$(dirname "${0}")/ci_stats_complete.js"
