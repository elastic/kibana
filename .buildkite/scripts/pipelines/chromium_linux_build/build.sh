#!/usr/bin/env bash

set -euo pipefail

CHROMIUM_COMMIT_HASH=$(buildkite-agent meta-data get "chromium_commit_hash")

echo "---Preparing to build Chromium of commit hash: $CHROMIUM_COMMIT_HASH"

BUILD_ROOT_DIR="$HOME/chromium"

KIBANA_CHECKOUT_DIR="$(pwd)"

BUILD_SCRIPT="$KIBANA_CHECKOUT_DIR/x-pack/build_chromium"

# Create a dedicated working directory outside of the default buildkite working directory.
mkdir "$BUILD_ROOT_DIR" && cd "$BUILD_ROOT_DIR"

ARTIFACT_STORAGE_BUCKET="gs://headless_shell_staging"
ARTIFACT_QUERY="chromium-${CHROMIUM_COMMIT_HASH:0:7}-.*_$PLATFORM_VARIANT"

## impersonate service account that has access to our storage bucket 
"$KIBANA_CHECKOUT_DIR/.buildkite/scripts/common/activate_service_account.sh" "kibana-ci-access-chromium-blds"

# Try to download build artifact from the storage bucket if it exists
gsutil ls $ARTIFACT_STORAGE_BUCKET | grep "$ARTIFACT_QUERY" | while read -r file; do
  gsutil cp "$file" .
done

shopt -s nullglob
files=("chromium-*")
shopt -u nullglob

if [ ${#files[@]} -gt 0 ]; then
    echo "---Chromium build already exists in the bucket, skipping build"
    # Upload the existing build artifact to buildkite so it can be used in the next steps, 
    # and accessible without necessarily having access to the storage bucket itself
    buildkite-agent artifact upload "chromium-*"
else
    echo "---Chromium build does not exist in the bucket, proceeding with the build"

    # Install the required packages for building chromium
    sudo apt-get update && \
    sudo apt-get install -y curl git build-essential pkg-config gcc gperf python3 && \
    sudo rm -rf /var/lib/apt/lists/*

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

    echo "---Persisting build artefact to buildkite"

    buildkite-agent artifact upload "$BUILD_ROOT_DIR/chromium/src/out/headless/chromium-*"
fi

"$KIBANA_CHECKOUT_DIR/.buildkite/scripts/common/activate_service_account.sh" --unset-impersonation

echo "---Build completed"
