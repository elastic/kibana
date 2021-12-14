#!/usr/bin/env bash

set -euo pipefail

export KBN_NP_PLUGINS_BUILT=true

echo "--- Build Kibana Distribution"
if [[ "${GITHUB_PR_LABELS:-}" == *"ci:build-all-platforms"* ]]; then
  node scripts/build --all-platforms --skip-os-packages
elif [[ "${GITHUB_PR_LABELS:-}" == *"ci:build-os-packages"* ]]; then
  node scripts/build --all-platforms
else
  node scripts/build
fi

echo "--- Archive Kibana Distribution"
linuxBuild="$(find "$KIBANA_DIR/target" -name 'kibana-*-linux-x86_64.tar.gz')"
installDir="$KIBANA_DIR/install/kibana"
mkdir -p "$installDir"
tar -xzf "$linuxBuild" -C "$installDir" --strip=1
mkdir -p "$KIBANA_BUILD_LOCATION"
cp -pR install/kibana/. "$KIBANA_BUILD_LOCATION/"
