#!/bin/bash
# Index per-(plugin, dep) dependency usage docs into Elasticsearch.
#
# Usage:
#   bash scripts/index_dependency_usage.sh -p <plugin_path> [options]
#
# Environment variables:
#   ELASTICSEARCH_URL      ES base URL (default: http://localhost:9200)
#   ELASTICSEARCH_API_KEY  API key for authentication
#
# Examples:
#   # Dry-run — print NDJSON to stdout
#   bash scripts/index_dependency_usage.sh -p x-pack/platform/plugins/shared/security -n
#
#   # Index with a local ES cluster
#   bash scripts/index_dependency_usage.sh -p x-pack/platform/plugins/shared/security -t
#
#   # Index against Elastic Cloud with an API key
#   ELASTICSEARCH_URL=https://my-deployment.es.us-east-1.aws.elastic-cloud.com \
#   ELASTICSEARCH_API_KEY=id:key \
#   bash scripts/index_dependency_usage.sh -p x-pack/platform/plugins/shared/security -t

NODE_OPTIONS="--max-old-space-size=8192" NODE_NO_WARNINGS=1 TS_NODE_TRANSPILE_ONLY=true TS_NODE_PROJECT=packages/kbn-dependency-usage/tsconfig.json \
node --loader "$(npm root -g)/ts-node/esm.mjs" packages/kbn-dependency-usage/src/indexer/cli.ts "$@"
