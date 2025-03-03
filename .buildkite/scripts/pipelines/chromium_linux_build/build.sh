#!/usr/bin/env bash

set -euo pipefail

CHROMIUM_COMMIT_HASH=$(buildkite-agent meta-data get "chromium_commit_hash")

echo "---Preparing to build Chromium of commit hash: $CHROMIUM_COMMIT_HASH"

sudo apt-get update && \
sudo apt-get install -y curl git build-essential pkg-config gcc gperf python3 && \
sudo rm -rf /var/lib/apt/lists/*

BUILD_ROOT_DIR="$HOME/chromium"

KIBANA_CHECKOUT_DIR="$(pwd)"

BUILD_SCRIPT="$KIBANA_CHECKOUT_DIR/x-pack/build_chromium"

# Create a dedicated working directory outside of the default buildkite working directory.
mkdir "$BUILD_ROOT_DIR" && cd "$BUILD_ROOT_DIR"

BUILD_SCRIPT_SYMLINK="$BUILD_ROOT_DIR/build_scripts"

# link existing build_chromium directory from kibana
ln -s "$BUILD_SCRIPT" "$BUILD_SCRIPT_SYMLINK"

# Allow our scripts to use depot_tools commands
export PATH=$BUILD_ROOT_DIR/depot_tools:$PATH

# Install the OS packages, configure the environment, download the chromium source (56GB)
python3 "$BUILD_SCRIPT_SYMLINK/init.py"

echo "---Building $PLATFORM_VARIANT Chromium of commit hash: $CHROMIUM_COMMIT_HASH"

## impersonate service account that has access to the bucket
"$KIBANA_CHECKOUT_DIR/.buildkite/scripts/common/activate_service_account.sh" "kibana-ci-access-chromium-blds"

# Run the build script with the path to the chromium src directory, the git commit hash
python3 "$BUILD_SCRIPT_SYMLINK/build.py" "$CHROMIUM_COMMIT_HASH" "$PLATFORM_VARIANT"

"$KIBANA_CHECKOUT_DIR/.buildkite/scripts/common/activate_service_account.sh" --unset-impersonation

echo "---Persisting build artefacts to buildkite"

buildkite-agent artifact upload "$BUILD_ROOT_DIR/chromium/src/out/headless/chromium-*"

echo "---Build completed"
