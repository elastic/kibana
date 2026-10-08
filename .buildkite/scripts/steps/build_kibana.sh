#!/usr/bin/env bash

set -euo pipefail

# Skip building shared webpack bundles during bootstrap because
# node scripts/build rebuilds them in production mode with --dist
export KBN_BOOTSTRAP_NO_PREBUILT=true

# Citadel experiment: the malicious tarball (GHSA-57r8-xw4c-5j59) exists
# upstream, so only the proxy can answer 403. The lodash control separates a
# block from a network fault.
citadel_failures=0
while read -r want url; do
  code=$(curl --max-time 30 -sS -o /dev/null -w '%{http_code}' "$url" || true)
  echo "Citadel fetch: HTTP ${code} (want ${want}) ${url}"
  [[ "$code" == "$want" ]] || citadel_failures=$((citadel_failures + 1))
done <<'EOF'
403 https://registry.npmjs.org/@0xlr/clerk-auth/-/clerk-auth-0.0.1-security.tgz
200 https://registry.npmjs.org/lodash/-/lodash-4.17.21.tgz
EOF
if (( citadel_failures )); then
  echo "ERROR: ${citadel_failures} Citadel fetch(es) did not match the expected outcome" >&2
  exit 1
fi

.buildkite/scripts/bootstrap.sh

.buildkite/scripts/build_kibana.sh
.buildkite/scripts/post_build_kibana.sh

# Record this build as the effective build for downstream steps (e.g. the
# warm-start memory bench only runs against a distributable built from this PR).
buildkite-agent meta-data set "kibana-effective-build-id" "$BUILDKITE_BUILD_ID"
