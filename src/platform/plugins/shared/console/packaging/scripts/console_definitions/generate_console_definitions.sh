#!/bin/bash

# Script to generate console definitions for multiple Elasticsearch versions
# This script clones Kibana and Elasticsearch specification repos and generates
# console definitions for versions 9.0, 8.19, and 8.18

set -e  # Exit on any error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK_DIR="/tmp/console_definitions_temp"
KIBANA_REPO="https://github.com/elastic/kibana.git"
ES_SPEC_REPO="https://github.com/elastic/elasticsearch-specification.git"
VERSIONS=("9.2")

echo "=== Console Definitions Generator ==="
echo "Script directory: $SCRIPT_DIR"
echo "Temporary working directory: $WORK_DIR"
echo "Final output will be at: $(realpath "$SCRIPT_DIR/../../console_definitions_target")"

# Clean and create working directory
if [ -d "$WORK_DIR" ]; then
    echo "Cleaning existing temporary directory..."
    rm -rf "$WORK_DIR"
fi
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

# Function to process a specific version
process_version() {
    local version=$1
    echo ""
    echo "=== Processing version $version ==="

    # Clean any existing directories for this version
    rm -rf "kibana-$version" "elasticsearch-specification-$version"

    # Clone Kibana repo with shallow clone for specific version
    echo "Cloning Kibana $version (shallow clone)..."
    git clone --depth 1 --branch "$version" "$KIBANA_REPO" "kibana-$version" || {
        echo "Error: Branch $version not found in Kibana repository..."
        return 1
    }

    # Clone Elasticsearch specification repo with shallow clone
    echo "Cloning Elasticsearch specification v$version (shallow clone)..."
    git clone --depth 1 --branch "$version" "$ES_SPEC_REPO" "elasticsearch-specification-$version" || {
        echo "Error: Branch $version not found in elasticsearch-specification..."
        return 1
    }

    cd "kibana-$version"

    # Bootstrap Kibana dependencies
    echo "Bootstrapping Kibana dependencies for version $version..."
    if [ -f ".buildkite/scripts/bootstrap.sh" ]; then
      yarn install || echo "yarn install failed..."
    fi

    # Create temporary destination directory for generated definitions
    TEMP_DEST_DIR="src/platform/plugins/shared/console/packaging/console_definitions/$version/generated"
    mkdir -p "$TEMP_DEST_DIR"

    # Generate console definitions
    echo "Generating console definitions for version $version..."
    node scripts/generate_console_definitions.js \
        --source "../elasticsearch-specification-$version" \
        --dest "$TEMP_DEST_DIR" \
        --emptyDest

    echo "Console definitions for version $version generated successfully!"

    # Create final destination directory
    mkdir -p "$SCRIPT_DIR/../../console_definitions_target/$version"
    PERSISTENT_DEST="$(realpath "$SCRIPT_DIR/../../console_definitions_target/$version")"

    # Copy entire spec_definitions directory structure from Kibana repo
    KIBANA_SPEC_DEFINITIONS_DIR="src/platform/plugins/shared/console/server/lib/spec_definitions"
    if [ -d "$KIBANA_SPEC_DEFINITIONS_DIR" ]; then
        echo "Copying spec_definitions directory structure to: $PERSISTENT_DEST"
        cp -r "$KIBANA_SPEC_DEFINITIONS_DIR/." "$PERSISTENT_DEST/"

        # Fix import paths in TypeScript files to point to the correct spec_definitions_service
        echo "Fixing import paths in TypeScript files for version $version..."
        # Fix files directly in js/ folder
        find "$PERSISTENT_DEST/js" -name "*.ts" -maxdepth 1 -type f -exec sed -i '' "s#from '../../../services'#from '../../../../../server/services'#g" {} \;
        # Fix files in js/query/ subfolder
        find "$PERSISTENT_DEST/js/query" -name "*.ts" -type f -exec sed -i '' "s#from '../../../../services'#from '../../../../../../server/services'#g" {} \; 2>/dev/null || true
    else
        echo "Warning: spec_definitions directory not found in Kibana repo for version $version"
        mkdir -p "$PERSISTENT_DEST/js"
        mkdir -p "$PERSISTENT_DEST/json"
    fi

    # Create generated directory and copy generated definitions
    mkdir -p "$PERSISTENT_DEST/json/generated"
    echo "Copying generated definitions to: $PERSISTENT_DEST/json/generated"
    cp -r "$TEMP_DEST_DIR"/* "$PERSISTENT_DEST/json/generated/"

    # Go back to work directory
    cd "$WORK_DIR"

    # Clean up this version's repos to save space
    echo "Cleaning up repositories for version $version..."
    rm -rf "kibana-$version" "elasticsearch-specification-$version"
}

# Process each version
for version in "${VERSIONS[@]}"; do
    process_version "$version"
done

echo ""
echo "=== All versions processed successfully! ==="
echo "Generated definitions located at:"
for version in "${VERSIONS[@]}"; do
    PERSISTENT_DEST="$(realpath "$SCRIPT_DIR/../../console_definitions_target/$version")"
    if [ -d "$PERSISTENT_DEST" ]; then
        echo "  - Version $version: $PERSISTENT_DEST"
        echo "    JS definitions: $(ls -1 "$PERSISTENT_DEST/js" 2>/dev/null | wc -l) files"
        echo "    JSON Generated: $(ls -1 "$PERSISTENT_DEST/json/generated" 2>/dev/null | wc -l) files"
        echo "    JSON Manual: $(ls -1 "$PERSISTENT_DEST/json/manual" 2>/dev/null | wc -l) files"
        echo "    JSON Overrides: $(ls -1 "$PERSISTENT_DEST/json/overrides" 2>/dev/null | wc -l) files"
    fi
done

echo ""
echo "Console definitions are now available in the target folder:"
echo "$(realpath "$SCRIPT_DIR/../../console_definitions_target/")"
