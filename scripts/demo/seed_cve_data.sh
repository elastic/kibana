#!/usr/bin/env bash
# Seed CVE data into Elasticsearch for the vulnerability checker demo.
# Creates the index with proper mappings and bulk-indexes real CVE records.
#
# Usage: ./seed_cve_data.sh
#
# Expects:
#   ES_URL  (default: http://localhost:9200)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ES_URL="${ES_URL:-http://localhost:9200}"
AUTH="elastic:changeme"
CVE_INDEX=".security-vulnerability-cve-default"

es() {
  local method="$1" path="$2"; shift 2
  curl -sf -X "${method}" \
    -u "${AUTH}" \
    -H "Content-Type: application/json" \
    "${ES_URL}${path}" "$@"
}

echo "=== Seeding CVE Data ==="
echo "ES: ${ES_URL}"
echo "Index: ${CVE_INDEX}"

# ── 1. Create index with mappings ────────────────────────────────────────
echo "--- Creating CVE index ---"
INDEX_EXISTS=$(curl -sf -o /dev/null -w "%{http_code}" -u "${AUTH}" "${ES_URL}/${CVE_INDEX}" 2>/dev/null || echo "000")

if [[ "${INDEX_EXISTS}" == "200" ]]; then
  echo "Index already exists, deleting and recreating..."
  es DELETE "/${CVE_INDEX}" >/dev/null 2>&1 || true
fi

es PUT "/${CVE_INDEX}" -d '{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0,
    "index.hidden": true
  },
  "mappings": {
    "properties": {
      "cve": {
        "properties": {
          "id":               { "type": "keyword" },
          "description":      { "type": "text" },
          "severity":         { "type": "keyword" },
          "cvss_score":       { "type": "float" },
          "cwe_ids":          { "type": "keyword" },
          "affected_products": {
            "type": "nested",
            "properties": {
              "vendor":           { "type": "keyword" },
              "product":          { "type": "keyword" },
              "version_start":    { "type": "keyword" },
              "version_end":      { "type": "keyword" },
              "version_end_type": { "type": "keyword" }
            }
          },
          "published_date":   { "type": "date" },
          "modified_date":    { "type": "date" },
          "patch_available":  { "type": "boolean" }
        }
      },
      "@timestamp": { "type": "date" }
    }
  }
}'
echo ""
echo "Index created with mappings"

# ── 2. Bulk index CVE records ────────────────────────────────────────────
echo "--- Bulk indexing CVE records ---"
NDJSON_FILE="${SCRIPT_DIR}/cve_data.ndjson"

if [[ ! -f "${NDJSON_FILE}" ]]; then
  echo "ERROR: ${NDJSON_FILE} not found" >&2
  exit 1
fi

BULK_RESPONSE=$(curl -sf -X POST \
  -u "${AUTH}" \
  -H "Content-Type: application/x-ndjson" \
  "${ES_URL}/_bulk" \
  --data-binary @"${NDJSON_FILE}")

ERRORS=$(echo "${BULK_RESPONSE}" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print('true' if d.get('errors') else 'false')
except: print('unknown')
" 2>/dev/null)

ITEM_COUNT=$(echo "${BULK_RESPONSE}" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(len(d.get('items', [])))
except: print(0)
" 2>/dev/null)

echo "Indexed ${ITEM_COUNT} items (errors: ${ERRORS})"

if [[ "${ERRORS}" == "true" ]]; then
  echo "WARNING: Some items had errors during indexing"
  echo "${BULK_RESPONSE}" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for item in d.get('items', []):
    op = item.get('index', {})
    if op.get('error'):
        print(f\"  {op['_id']}: {op['error']['reason']}\")
" 2>/dev/null
fi

# ── 3. Refresh index ────────────────────────────────────────────────────
es POST "/${CVE_INDEX}/_refresh" >/dev/null 2>&1

# ── 4. Verify ────────────────────────────────────────────────────────────
echo "--- Verifying ---"
DOC_COUNT=$(es GET "/${CVE_INDEX}/_count" 2>/dev/null | python3 -c "
import sys, json
try: print(json.load(sys.stdin).get('count', 0))
except: print(0)
" 2>/dev/null)

SEVERITY_DIST=$(es POST "/${CVE_INDEX}/_search" -d '{
  "size": 0,
  "aggs": {
    "by_severity": { "terms": { "field": "cve.severity" } }
  }
}' 2>/dev/null | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    buckets = d['aggregations']['by_severity']['buckets']
    parts = [f\"{b['key']}: {b['doc_count']}\" for b in buckets]
    print(', '.join(parts))
except: print('N/A')
" 2>/dev/null)

cat <<EOF

=== CVE Seed Complete ===
  Total CVE records: ${DOC_COUNT}
  Severity distribution: ${SEVERITY_DIST}
  Index: ${CVE_INDEX}
EOF
