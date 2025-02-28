#!/usr/bin/env bash

set -euo pipefail

sudo apt-get update && \
    apt-get install -y curl git-all build-essential pkg-config gcc gperf python3 && \
    rm -rf /var/lib/apt/lists/*

BUILD_ROOT_DIR="$HOME/chromium"

# Create a dedicated working directory for this directory of Python scripts.
mkdir "$BUILD_ROOT_DIR" && cd "$BUILD_ROOT_DIR"

FETCHED_BUILD_SCRIPT_DIR="$BUILD_ROOT_DIR/build_scripts"

# Checkout the x-pack/build_chromium directory only from kibana
git clone -n --depth=1 --filter=tree:0  https://github.com/elastic/kibana "$FETCHED_BUILD_SCRIPT_DIR"
cd "$FETCHED_BUILD_SCRIPT_DIR"
git sparse-checkout set --no-cone x-pack/build_chromium
git checkout main

# return to chromium directory
cd "$BUILD_ROOT_DIR"

# Allow our scripts to use depot_tools commands
export PATH=$HOME/chromium/depot_tools:$PATH

# Install the OS packages, configure the environment, download the chromium source (25GB)
python3 "$FETCHED_BUILD_SCRIPT_DIR/x-pack/build_chromium/init.py"

CHROMIUM_COMMIT_HASH=$(buildkite-agent meta-data get "chromium_commit_hash")

echo "---Building $PLATFORM_VARIANT Chromium of commit hash: $CHROMIUM_COMMIT_HASH"

# Run the build script with the path to the chromium src directory, the git commit hash
python3 ./build_chromium/build.py "$CHROMIUM_COMMIT_HASH" "$PLATFORM_VARIANT"

# TODO: set up output as buildkite artefact
buildkite-agent artifact upload chromium/src/out/chromium-*
