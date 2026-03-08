#!/bin/bash
# Seeds a large Elasticsearch index for testing step memory limits.
# Creates 10,000 documents with ~1KB each in the 'large-test-data' index.
# Total index size: ~10MB, enough to exceed a 5mb max-step-size limit with size:10000.
#
# Usage: bash src/platform/plugins/shared/workflows_execution_engine/docs/examples/seed_large_index.sh
#
# Requires: curl, local Elasticsearch at https://localhost:9200

ES_URL="https://localhost:9200"
ES_AUTH="elastic:changeme"
INDEX="large-test-data"
CURL_OPTS="--insecure -s"

echo "=== Seeding '$INDEX' index with 10,000 documents ==="

# Delete existing index (ignore errors if it doesn't exist)
curl $CURL_OPTS -u "$ES_AUTH" -X DELETE "$ES_URL/$INDEX" > /dev/null 2>&1

# Create index with mappings
curl $CURL_OPTS -u "$ES_AUTH" -X PUT "$ES_URL/$INDEX" -H 'Content-Type: application/json' -d '{
  "settings": { "number_of_shards": 1, "number_of_replicas": 0 },
  "mappings": {
    "properties": {
      "timestamp": { "type": "date" },
      "message": { "type": "text" },
      "host": { "type": "keyword" },
      "level": { "type": "keyword" },
      "pid": { "type": "integer" },
      "payload": { "type": "text" }
    }
  }
}'
echo ""

# Generate and bulk index documents in batches of 500
TOTAL=10000
BATCH=500
GENERATED=0

PADDING="This is padding text to make each document approximately one kilobyte in size for testing step memory limits in the Kibana workflow execution engine. The purpose is to create a dataset large enough that querying all documents will exceed the configured max-step-size limit and trigger a StepSizeLimitExceeded error. Adding more words here to reach the target size for reliable testing across different environments and configurations used by the team."

while [ $GENERATED -lt $TOTAL ]; do
  BODY=""
  for i in $(seq 1 $BATCH); do
    DOC_NUM=$((GENERATED + i))
    if [ $DOC_NUM -gt $TOTAL ]; then break; fi
    BODY="$BODY{\"index\":{}}\n"
    BODY="$BODY{\"timestamp\":\"2026-02-15T12:00:00Z\",\"message\":\"Log entry $DOC_NUM\",\"host\":\"server-$((DOC_NUM % 10))\",\"level\":\"info\",\"pid\":$DOC_NUM,\"payload\":\"$PADDING\"}\n"
  done

  RESULT=$(printf "$BODY" | curl $CURL_OPTS -u "$ES_AUTH" -X POST "$ES_URL/$INDEX/_bulk" -H 'Content-Type: application/x-ndjson' --data-binary @- 2>&1)
  ERRORS=$(echo "$RESULT" | grep -o '"errors":false' | head -1)

  GENERATED=$((GENERATED + BATCH))
  if [ $GENERATED -gt $TOTAL ]; then GENERATED=$TOTAL; fi
  echo "  Indexed $GENERATED / $TOTAL documents (errors: ${ERRORS:-check output})"
done

# Refresh to make documents searchable
curl $CURL_OPTS -u "$ES_AUTH" -X POST "$ES_URL/$INDEX/_refresh" > /dev/null 2>&1

echo ""
echo "=== Index stats ==="
curl $CURL_OPTS -u "$ES_AUTH" "$ES_URL/$INDEX/_count" -H 'Content-Type: application/json'
echo ""
echo ""
echo "=== Done! ==="
echo "The '$INDEX' index now has 10,000 documents (~10MB total)."
echo "Use with: docs/examples/test_es_size_limit.yaml"
