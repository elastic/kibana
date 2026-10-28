#!/usr/bin/env bash
set -euo pipefail

exec buildkite-agent oidc request-token \
  --audience="$GOOGLE_EXTERNAL_ACCOUNT_AUDIENCE" \
  --format=gcp \
  --log-level=error \
  --debug=false
