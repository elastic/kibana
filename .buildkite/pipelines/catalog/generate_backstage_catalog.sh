#!/usr/bin/env bash


set -euo pipefail

# ==============================================================
# Backstage Catalog Sync Script
# ==============================================================
# Description: Scans Kibana packages and generates Backstage component YAMLs in kibana-package-catalog repo.
# ==============================================================

echo "--- Generate catalog components from Kibana packages"

# Clone kibana-package-catalog outside of kibana folder
git clone https://x-access-token:${GITHUB_TOKEN}@github.com/elastic/kibana-package-catalog.git ../kibana-package-catalog

# Clean old entries
rm -rf ../kibana-package-catalog/packages

# Ensure directory exists
mkdir -p ../kibana-package-catalog/packages

# Generate new entries in ../kibana-packages-catalog/packages
npx ts-node .buildkite/pipelines/catalog/generate_catalog_components_from_kibana_packages.ts

# Compare, commit, and create/update PR in kibana-package-catalog repo
npx ts-node .buildkite/pipelines/catalog/compare-and-commit-catalog-changes.ts
