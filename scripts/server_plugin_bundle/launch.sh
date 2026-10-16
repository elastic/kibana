#!/bin/bash
# Boot serverless security with the rspack plugin bundle preloaded.
set -u
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../.." && pwd)
OUT=${KBN_PLUGIN_BUNDLE_OUT:-/tmp/kibana-server-plugin-bundle}
PORT=${KBN_SERVER_PORT:-5602}
ES=${KBN_ES_URL:-http://127.0.0.1:9201}
NODE=${KBN_NODE:-node}

cd "$REPO"
export KBN_PLUGIN_BUNDLE=1
export KBN_PLUGIN_BUNDLE_OUT="$OUT"
export KBN_REPO="$REPO"
export KBN_PATH_CONF="$REPO/config"
unset HEAP_TRACK_FORCE
unset BUNDLE_PRELOAD_FORCE
unset isDevCliChild
unset isCliChild
export NODE_OPTIONS="--require $HERE/preload.js --max-old-space-size=8192"
exec "$NODE" src/cli/kibana/dist.js \
  --serverless=security \
  --server.port="$PORT" \
  --elasticsearch="$ES" \
  --ops.interval=200ms \
  --logging.loggers[0].name=metrics.ops \
  --logging.loggers[0].level=debug \
  --xpack.encryptedSavedObjects.encryptionKey=0123456789abcdef0123456789abcdef \
  --xpack.security.encryptionKey=0123456789abcdef0123456789abcdef \
  --xpack.reporting.encryptionKey=0123456789abcdef0123456789abcdef \
  --xpack.security.uiam.enabled=true \
  --xpack.security.uiam.url=http://127.0.0.1:9 \
  --xpack.security.uiam.sharedSecret=0123456789abcdef0123456789abcdef \
  --xpack.security.uiam.ssl.verificationMode=none \
  --no-base-path \
  --env.name=development \
  --server.restrictInternalApis=true
