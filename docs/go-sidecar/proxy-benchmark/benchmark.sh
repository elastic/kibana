#!/usr/bin/env bash
#
# Proxy overhead benchmark: measures latency and throughput of the
# /internal/benchmark endpoint at various response sizes and concurrency levels.
#
# Prerequisites:
#   - wrk installed (brew install wrk)
#   - Kibana running
#
# Usage:
#   ./benchmark.sh
#   ./benchmark.sh --duration 10 --url https://localhost:5601

set -euo pipefail
cd "$(dirname "$0")"

# --- Defaults ---
BASE_URL="https://localhost:5601"
DURATION=30
THREADS=4
SIZES=(100 1024 10240 102400 1048576)
CONNECTIONS=(1 10 50 100)

# --- Parse args ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)       BASE_URL="$2";   shift 2 ;;
    --duration)  DURATION="$2";   shift 2 ;;
    --threads)   THREADS="$2";    shift 2 ;;
    *)           echo "Unknown arg: $1"; exit 1 ;;
  esac
done

for size in "${SIZES[@]}"; do
  if   (( size >= 1048576 )); then size_label="$((size / 1048576))MB"
  elif (( size >= 1024 ));    then size_label="$((size / 1024))KB"
  else                             size_label="${size}B"
  fi

  echo ""
  echo "--- Response size: $size_label ---"
  echo ""

  for conns in "${CONNECTIONS[@]}"; do
    echo "  connections=$conns"
    echo ""

    t=$(( conns < THREADS ? conns : THREADS ))
    wrk -t"$t" -c"$conns" -d"${DURATION}s" \
        --latency \
        "${BASE_URL}/api/benchmark?size=${size}" \
        | sed 's/^/    /'

    echo ""
  done
done
