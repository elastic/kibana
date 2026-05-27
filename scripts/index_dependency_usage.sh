#!/bin/bash
# Index per-(plugin, dep) dependency usage docs into Elasticsearch.
#
# Requires: Node 24+ (uses --experimental-strip-types to run TS natively)
#           and root node_modules installed (yarn install).
#
# Usage:
#   bash scripts/index_dependency_usage.sh --paths <plugin_path> [options]
#
# Environment variables:
#   ELASTICSEARCH_URL      ES base URL (default: http://localhost:9200)
#   ELASTICSEARCH_API_KEY  API key for authentication
#
# Examples:
#   # Dry-run — print NDJSON to stdout
#   bash scripts/index_dependency_usage.sh --paths x-pack/platform/plugins/shared/security -n
#
#   # Index a single plugin against a local ES cluster (also creates index template)
#   bash scripts/index_dependency_usage.sh --paths x-pack/platform/plugins/shared/security -t
#
#   # Index all x-pack platform plugins against Elastic Cloud
#   ELASTICSEARCH_URL=https://my-deployment.es.us-east-1.aws.elastic-cloud.com \
#   ELASTICSEARCH_API_KEY=id:key \
#   bash scripts/index_dependency_usage.sh \
#     --paths x-pack/platform/plugins/shared x-pack/platform/plugins/private \
#     --concurrency 4

# Node 24 can run TypeScript natively via --experimental-strip-types.
# No ts-node or build step required.
#
# NODE_TLS_REJECT_UNAUTHORIZED=0 allows self-signed certs used by local
# serverless clusters. Remote Elastic Cloud endpoints use valid certs so
# this has no effect in CI.
NODE_OPTIONS="--max-old-space-size=8192" NODE_NO_WARNINGS=1 NODE_TLS_REJECT_UNAUTHORIZED=0 \
node --experimental-strip-types packages/kbn-dependency-usage/src/indexer/cli.ts "$@"
