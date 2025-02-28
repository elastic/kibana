#!/usr/bin/env bash

set -euo pipefail

CHROMIUM_COMMIT_HASH=$(buildkite-agent meta-data get "chromium_commit_hash")

echo "---Preparing to build Chromium of commit hash: $CHROMIUM_COMMIT_HASH"

sudo apt-get update && \
    apt-get install -y curl git-all build-essential pkg-config gcc gperf python3 && \
    rm -rf /var/lib/apt/lists/*

BUILD_ROOT_DIR="$HOME/chromium"

BUILD_SCRIPT="$(pwd)/x-pack/build_chromium"

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

# Run the build script with the path to the chromium src directory, the git commit hash
python3 "$BUILD_SCRIPT_SYMLINK/build.py" "$CHROMIUM_COMMIT_HASH" "$PLATFORM_VARIANT"

# TODO: set up output as buildkite artefact
buildkite-agent artifact upload "$BUILD_ROOT_DIR/src/out/chromium-*"
