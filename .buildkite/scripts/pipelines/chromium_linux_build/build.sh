#!/usr/bin/env bash

set -euo pipefail

sudo apt-get update && \
    apt-get install -y curl git-all build-essential pkg-config gcc gperf python3 && \
    rm -rf /var/lib/apt/lists/*

# Create a dedicated working directory for this directory of Python scripts.
mkdir "${HOME}/chromium" && cd "${HOME}/chromium"

# Copy the scripts from the Kibana team's GCS bucket
gsutil cp -r gs://headless_shell_staging/build_chromium .

# Allow our scripts to use depot_tools commands
export PATH=$HOME/chromium/depot_tools:$PATH

# Install the OS packages, configure the environment, download the chromium source (25GB)
python3 ./build_chromium/init.py

CHROMIUM_COMMIT_HASH=$(buildkite-agent meta-data get "chromium_commit_hash")

echo "---Building $PLATFORM_VARIANT Chromium of commit hash: $CHROMIUM_COMMIT_HASH"

# Run the build script with the path to the chromium src directory, the git commit hash
python3 ./build_chromium/build.py $CHROMIUM_COMMIT_HASH $PLATFORM_VARIANT

# TODO: set up output as buildkite artefact
buildkite-agent artifact upload chromium/src/out/chromium-*
