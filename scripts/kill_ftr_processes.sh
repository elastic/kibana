#!/bin/bash
# Kill orphaned FTR test processes (Elasticsearch and Kibana)

echo "🔍 Checking for orphaned FTR processes..."

# Check and kill ES on port 9220
ES_PID=$(lsof -ti :9220 2>/dev/null)
if [ -n "$ES_PID" ]; then
  echo "🗑️  Killing Elasticsearch (PID: $ES_PID) on port 9220"
  kill -9 "$ES_PID" 2>/dev/null
else
  echo "✓ No Elasticsearch process found on port 9220"
fi

# Check and kill Kibana on port 5620
KIBANA_PID=$(lsof -ti :5620 2>/dev/null)
if [ -n "$KIBANA_PID" ]; then
  echo "🗑️  Killing Kibana (PID: $KIBANA_PID) on port 5620"
  kill -9 "$KIBANA_PID" 2>/dev/null
else
  echo "✓ No Kibana process found on port 5620"
fi

# Check for any node processes running kibana scripts
NODE_PROCS=$(ps aux | grep -E "node.*scripts/kibana" | grep -v grep | awk '{print $2}')
if [ -n "$NODE_PROCS" ]; then
  echo "🗑️  Killing orphaned node kibana processes: $NODE_PROCS"
  echo "$NODE_PROCS" | xargs kill -9 2>/dev/null
else
  echo "✓ No orphaned node kibana processes found"
fi

echo "✅ Cleanup complete!"

