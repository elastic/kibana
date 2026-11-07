#!/bin/bash
#
# Kibana-server-proxy vs direct-Elasticsearch benchmark (wrk)
#
# Measures the overhead of fetching an ES|QL result through the Kibana server
# (POST /internal/search/esql_async) compared with asking Elasticsearch directly
# (POST /_query/async?drop_null_columns=true, the exact call Kibana makes).
# Runs a matrix of response sizes x connection counts x targets, 30s each by default,
# and samples Kibana / Elasticsearch RSS during every run.
#
# Requests mimic Chrome: `Accept-Encoding: gzip, deflate, br, zstd` is sent to both
# targets (Kibana answers gzip, brotli is off by default). wrk does not decompress,
# so client-side decode cost is not measured.
#
# Prerequisites:
#   - wrk (brew install wrk), python3, lsof
#   - Elasticsearch + Kibana (no sidecar) running
#   - no data needed: responses come from an ES|QL `ROW` command sized to the target byte count
#
# Usage:
#   ./scripts/es_proxy_bench.sh [--kibana-url URL] [--es-url URL] [--user U] [--password P]
#     [--sizes "100B 1KB 10KB 100KB 1MB"]  (also supported: 5MB 10MB 20MB 21MB) [--connections "1 10 50 100"]
#     [--targets "es kibana"] [--duration 30] [--warmup 3] [--cooldown 5]
#     [--accept-encoding "gzip, deflate, br, zstd"] [--out DIR]

set -euo pipefail

KIBANA_URL="http://localhost:5601"
ES_URL="http://localhost:9200"
USER_NAME="elastic"
PASSWORD="changeme"
SIZES="100B 1KB 10KB 100KB 1MB"
CONNECTIONS="1 10 50 100"
TARGETS="es kibana"
DURATION=30
WARMUP=3
COOLDOWN=5
ACCEPT_ENCODING="gzip, deflate, br, zstd"
OUT_DIR=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --kibana-url) KIBANA_URL="$2"; shift 2 ;;
    --es-url) ES_URL="$2"; shift 2 ;;
    --user) USER_NAME="$2"; shift 2 ;;
    --password) PASSWORD="$2"; shift 2 ;;
    --sizes) SIZES="$2"; shift 2 ;;
    --connections) CONNECTIONS="$2"; shift 2 ;;
    --targets) TARGETS="$2"; shift 2 ;;
    --duration) DURATION="$2"; shift 2 ;;
    --warmup) WARMUP="$2"; shift 2 ;;
    --cooldown) COOLDOWN="$2"; shift 2 ;;
    --accept-encoding) ACCEPT_ENCODING="$2"; shift 2 ;;
    --out) OUT_DIR="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LUA_SCRIPT="$SCRIPT_DIR/es_proxy_bench_wrk.lua"
[ -z "$OUT_DIR" ] && OUT_DIR="$REPO_ROOT/target/es_proxy_bench/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$OUT_DIR"

for bin in wrk python3 lsof curl; do
  command -v "$bin" &>/dev/null || { echo "ERROR: $bin not found"; exit 1; }
done

KIBANA_VERSION=$(grep -m1 '"version"' "$REPO_ROOT/package.json" | sed 's/.*: *"\(.*\)".*/\1/')

# Target response sizes in bytes (uncompressed JSON).
size_bytes() {
  case "$1" in
    100B) echo 100 ;;
    1KB) echo 1024 ;;
    10KB) echo 10240 ;;
    100KB) echo 102400 ;;
    1MB) echo 1048576 ;;
    5MB) echo 5242880 ;;
    10MB) echo 10485760 ;;
    20MB) echo 20971520 ;;
    21MB) echo 22020096 ;;
    *) echo "ERROR: unknown size $1" >&2; exit 1 ;;
  esac
}

# Total string characters needed for a size. ES|QL JSON overhead is ~317 bytes plus ~35 per column.
size_chars() {
  local bytes cols
  bytes=$(size_bytes "$1")
  cols=$(( (bytes + 999999) / 1000000 ))
  local chars=$(( bytes - 317 - 35 * cols ))
  # The ES|QL JSON envelope alone is ~350 bytes, so "100B" is the smallest possible response (1 char).
  [ "$chars" -lt 1 ] && chars=1
  echo "$chars"
}

# A single-row ROW query with ceil(chars / 1e6) columns of REPEAT("x", n): REPEAT is capped at 1MB per
# value, so larger responses use several columns. ES cost is negligible, so the benchmark isolates
# transfer + proxy cost. Note "x" runs gzip ~1000:1; use --accept-encoding identity to measure raw copy cost.
query_for() {
  local remaining i=0 cols="" len
  remaining=$(size_chars "$1")
  while [ "$remaining" -gt 0 ]; do
    len=$(( remaining > 1000000 ? 1000000 : remaining ))
    cols="${cols}${cols:+, }c${i} = REPEAT(\\\"x\\\", ${len})"
    remaining=$(( remaining - len ))
    i=$(( i + 1 ))
  done
  echo "ROW ${cols}"
}

# Direct ES call mirrors what Kibana sends (defaults: wait 200ms, keep_alive 1m, no keep_on_completion).
es_body() {
  printf '{"query":"%s","locale":"en","wait_for_completion_timeout":"200ms","keep_on_completion":false,"keep_alive":"60000ms"}' "$(query_for "$1")"
}

# Mirrors the body Kibana's search interceptor posts for esql_async.
kibana_body() {
  printf '{"params":{"query":"%s","locale":"en","dropNullColumns":true},"stream":true,"isRestore":false,"isStored":false,"requestHash":"bench"}' "$(query_for "$1")"
}

# ---- Kibana session -------------------------------------------------------------------
echo "Authenticating against Kibana..."
COOKIE=$(curl -s -D - -o /dev/null "${KIBANA_URL}/internal/security/login" \
  -H 'Content-Type: application/json' -H 'kbn-xsrf: true' -H 'x-elastic-internal-origin: Kibana' \
  --data-raw '{"providerType":"basic","providerName":"basic","currentURL":"'"${KIBANA_URL}"'/login","params":{"username":"'"${USER_NAME}"'","password":"'"${PASSWORD}"'"}}' \
  | grep -i '^set-cookie:' | head -1 | sed 's/^[Ss]et-[Cc]ookie: //; s/;.*//' || true)
if [ -z "$COOKIE" ]; then
  echo "ERROR: could not authenticate against Kibana at ${KIBANA_URL}"; exit 1
fi
BASIC_AUTH=$(printf '%s:%s' "$USER_NAME" "$PASSWORD" | base64)

# Browser-like headers per target (wrk -H arguments are built from these).
header_args() {
  case "$1" in
    es)
      printf '%s\n' "Content-Type: application/json" "Authorization: Basic ${BASIC_AUTH}" \
        "Accept: */*" "Accept-Encoding: ${ACCEPT_ENCODING}" ;;
    kibana)
      printf '%s\n' "Content-Type: application/json" "Cookie: ${COOKIE}" \
        "Accept: */*" "Accept-Encoding: ${ACCEPT_ENCODING}" \
        "elastic-api-version: 1" "kbn-build-number: 9007199254740991" "kbn-version: ${KIBANA_VERSION}" \
        "x-elastic-internal-origin: Kibana" "Referer: ${KIBANA_URL}/app/discover" \
        "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36" ;;
  esac
}

target_url() {
  case "$1" in
    es) echo "${ES_URL}/_query/async?drop_null_columns=true" ;;
    kibana) echo "${KIBANA_URL}/internal/search/esql_async" ;;
  esac
}

target_body() {
  case "$1" in
    es) es_body "$2" ;;
    kibana) kibana_body "$2" ;;
  esac
}

# ---- Process discovery for RSS sampling --------------------------------------------
pid_on_port() {
  local port
  port=$(echo "$1" | sed 's#.*:\([0-9]*\).*#\1#')
  lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | head -1 || true
}
KIBANA_PID=$(pid_on_port "$KIBANA_URL")
ES_PID=$(pid_on_port "$ES_URL")
echo "Kibana pid: ${KIBANA_PID:-unknown}  ES pid: ${ES_PID:-unknown}"
if [ -n "$KIBANA_PID" ] && ps -o command= -p "$KIBANA_PID" | grep -q kbn_sidecar; then
  echo "ERROR: ${KIBANA_URL} is served by the Go sidecar; restart Kibana without it."; exit 1
fi

# ---- Validation: one request per target+size, record real response bytes -----------------
echo "target,size,chars,uncompressed_bytes,wire_bytes" > "$OUT_DIR/response_sizes.csv"
validate() {
  local target=$1 size=$2 hdrs=() h body_file
  body_file=$(mktemp)
  while IFS= read -r h; do hdrs+=(-H "$h"); done < <(header_args "$target")
  local wire
  wire=$(curl -s -o /dev/null -w '%{http_code} %{size_download}' "$(target_url "$target")" "${hdrs[@]}" \
    --data-raw "$(target_body "$target" "$size")")
  # Re-request without compression to learn the real payload size and check completion.
  local plain_hdrs=() code
  while IFS= read -r h; do
    case "$h" in Accept-Encoding*) ;; *) plain_hdrs+=(-H "$h") ;; esac
  done < <(header_args "$target")
  code=$(curl -s -o "$body_file" -w '%{http_code} %{size_download}' -H 'Accept-Encoding: identity' \
    "$(target_url "$target")" "${plain_hdrs[@]}" --data-raw "$(target_body "$target" "$size")")
  if [ "${wire%% *}" != "200" ] || [ "${code%% *}" != "200" ]; then
    echo "ERROR: $target $size returned HTTP ${wire%% *}/${code%% *}"; head -c 400 "$body_file"; rm -f "$body_file"; exit 1
  fi
  if ! head -c 400 "$body_file" | grep -q '"is_running":false'; then
    echo "ERROR: $target $size did not complete within wait_for_completion_timeout (is_running != false)"; rm -f "$body_file"; exit 1
  fi
  rm -f "$body_file"
  echo "$target,$size,$(size_chars "$size"),${code#* },${wire#* }" >> "$OUT_DIR/response_sizes.csv"
  echo "  validated $target $size: ${code#* } bytes uncompressed, ${wire#* } on the wire"
}

# ---- RSS sampling ---------------------------------------------------------------------------
SAMPLER_PID=""
start_sampler() {
  local file=$1
  : > "$file"
  (
    while true; do
      k=""; e=""
      [ -n "$KIBANA_PID" ] && k=$(ps -o rss= -p "$KIBANA_PID" 2>/dev/null | tr -d ' ' || true)
      [ -n "$ES_PID" ] && e=$(ps -o rss= -p "$ES_PID" 2>/dev/null | tr -d ' ' || true)
      echo "${k:-0},${e:-0}" >> "$file"
      sleep 1
    done
  ) &
  SAMPLER_PID=$!
}
stop_sampler() {
  [ -n "$SAMPLER_PID" ] && { kill "$SAMPLER_PID" 2>/dev/null || true; wait "$SAMPLER_PID" 2>/dev/null || true; SAMPLER_PID=""; }
}
trap stop_sampler EXIT

# ---- wrk -------------------------------------------------------------------------------------
# Converts wrk's "12.3ms" / "850.00us" / "1.20s" values to milliseconds.
to_ms() {
  echo "$1" | awk '{ v=$1; if (v ~ /us$/) { sub(/us$/,"",v); print v/1000 } else if (v ~ /ms$/) { sub(/ms$/,"",v); print v+0 } else if (v ~ /s$/) { sub(/s$/,"",v); print v*1000 } else print v }'
}
to_mb() {
  echo "$1" | awk '{ v=$1; if (v ~ /GB$/) { sub(/GB$/,"",v); print v*1024 } else if (v ~ /MB$/) { sub(/MB$/,"",v); print v+0 } else if (v ~ /KB$/) { sub(/KB$/,"",v); print v/1024 } else if (v ~ /B$/) { sub(/B$/,"",v); print v/1048576 } else print v }'
}

run_wrk() {
  local target=$1 conns=$2 secs=$3 out=$4 hargs=() h
  while IFS= read -r h; do hargs+=(-H "$h"); done < <(header_args "$target")
  local threads=2
  [ "$conns" -lt 2 ] && threads=1
  BENCH_BODY="$(target_body "$target" "$SIZE_CUR")" \
    wrk -t"$threads" -c"$conns" -d"${secs}s" --timeout 120s --latency -s "$LUA_SCRIPT" \
    "${hargs[@]}" "$(target_url "$target")" > "$out" 2>&1
}

echo "target,size,connections,requests,rps,transfer_mb_s,avg_ms,p50_ms,p90_ms,p99_ms,max_ms,non2xx,socket_errors,kibana_rss_avg_mb,kibana_rss_peak_mb,es_rss_avg_mb,es_rss_peak_mb" > "$OUT_DIR/results.csv"

record() {
  local target=$1 size=$2 conns=$3 raw=$4 rss=$5
  local requests rps xfer avg p50 p90 p99 max non2xx errs
  requests=$(awk '/requests in/ {print $1}' "$raw")
  rps=$(awk '/Requests\/sec:/ {print $2}' "$raw")
  xfer=$(to_mb "$(awk '/Transfer\/sec:/ {print $2}' "$raw")")
  avg=$(to_ms "$(awk '/^ *Latency / {print $2; exit}' "$raw")")
  max=$(to_ms "$(awk '/^ *Latency / {print $4; exit}' "$raw")")
  p50=$(to_ms "$(awk '$1=="50%" {print $2}' "$raw")")
  p90=$(to_ms "$(awk '$1=="90%" {print $2}' "$raw")")
  p99=$(to_ms "$(awk '$1=="99%" {print $2}' "$raw")")
  non2xx=$(awk '/Non-2xx/ {print $NF}' "$raw"); non2xx=${non2xx:-0}
  errs=$(awk '/Socket errors:/ {gsub(/,/,""); print $4+$6+$8+$10}' "$raw"); errs=${errs:-0}
  local mem
  mem=$(awk -F, '{k+=$1; e+=$2; if($1>kp)kp=$1; if($2>ep)ep=$2; n++} END {if(n==0)n=1; printf "%.0f,%.0f,%.0f,%.0f", k/n/1024, kp/1024, e/n/1024, ep/1024}' "$rss")
  echo "$target,$size,$conns,${requests:-0},${rps:-0},${xfer:-0},${avg:-0},${p50:-0},${p90:-0},${p99:-0},${max:-0},$non2xx,$errs,$mem" >> "$OUT_DIR/results.csv"
  echo "    ${target} ${size} c=${conns}: ${rps:-0} req/s, p50 ${p50:-0}ms, p99 ${p99:-0}ms, non2xx=${non2xx}, errors=${errs}"
}

echo "Output directory: $OUT_DIR"
echo "Matrix: sizes=[$SIZES] connections=[$CONNECTIONS] targets=[$TARGETS] duration=${DURATION}s"

for size in $SIZES; do
  SIZE_CUR=$size
  echo "== $size =="
  for target in $TARGETS; do validate "$target" "$size"; done
  for conns in $CONNECTIONS; do
    for target in $TARGETS; do
      [ "$WARMUP" -gt 0 ] && run_wrk "$target" "$conns" "$WARMUP" /dev/null || true
      sleep "$COOLDOWN"
      size_file=$(echo "$size" | tr '[:upper:]' '[:lower:]')
      raw="$OUT_DIR/wrk_${target}_${size_file}_c${conns}.txt"
      rss="$OUT_DIR/rss_${target}_${size_file}_c${conns}.csv"
      start_sampler "$rss"
      run_wrk "$target" "$conns" "$DURATION" "$raw" || echo "    wrk exited non-zero for $target $size c=$conns"
      stop_sampler
      record "$target" "$size" "$conns" "$raw" "$rss"
    done
  done
done

# ---- Summary ---------------------------------------------------------------------------------
python3 -I - "$OUT_DIR" <<'PY'
import csv, sys, os
out = sys.argv[1]
rows = list(csv.DictReader(open(os.path.join(out, 'results.csv'))))
sizes = {(r['target'], r['size']): r for r in csv.DictReader(open(os.path.join(out, 'response_sizes.csv')))}
by = {(r['size'], int(r['connections']), r['target']): r for r in rows}
order_sizes = list(dict.fromkeys(r['size'] for r in rows))
order_conns = sorted({int(r['connections']) for r in rows})
def f(v, d=1): return f"{float(v):.{d}f}"
def pct(a, b):
    a, b = float(a), float(b)
    return 'n/a' if b == 0 else f"{(a - b) / b * 100:+.0f}%"
lines = ['# Kibana vs direct Elasticsearch (ES|QL async)', '']
lines += ['## Throughput change (Kibana vs direct ES)', '', '| Size | ' + ' | '.join(f'c={c}' for c in order_conns) + ' |', '|---|' + '---|' * len(order_conns)]
for s in order_sizes:
    cells = []
    for c in order_conns:
        d, k = by.get((s, c, 'es')), by.get((s, c, 'kibana'))
        cells.append(pct(k['rps'], d['rps']) if d and k else 'n/a')
    lines.append(f"| {s} | " + ' | '.join(cells) + ' |')
lines.append('')
def fmt_ms(v):
    v = float(v)
    return f'{v:.1f}' if v >= 1 else f'{v:.2f}'
for col, label in (('p50_ms', 'p50'), ('p99_ms', 'p99')):
    lines += [f'## {label} latency in ms (direct ES → Kibana)', '', '| Size | ' + ' | '.join(f'c={c}' for c in order_conns) + ' |', '|---|' + '---|' * len(order_conns)]
    for s in order_sizes:
        cells = []
        for c in order_conns:
            d, k = by.get((s, c, 'es')), by.get((s, c, 'kibana'))
            cells.append(f"{fmt_ms(d[col])} → {fmt_ms(k[col])}" if d and k else 'n/a')
        lines.append(f"| {s} | " + ' | '.join(cells) + ' |')
    lines.append('')
lines.append('Response bytes (uncompressed / gzip on the wire):')
lines.append('')
lines.append('| Size | Direct ES | Kibana |')
lines.append('|---|---|---|')
for s in order_sizes:
    es, kb = sizes.get(('es', s)), sizes.get(('kibana', s))
    lines.append(f"| {s} | {es['uncompressed_bytes'] + ' / ' + es['wire_bytes'] if es else '-'} | {kb['uncompressed_bytes'] + ' / ' + kb['wire_bytes'] if kb else '-'} |")
for s in order_sizes:
    lines += ['', f'## {s}', '',
              '| Conns | Direct req/s | Kibana req/s | Throughput change | Direct p50 / p99 (ms) | Kibana p50 / p99 (ms) | Kibana RSS avg / peak (MB) | Errors (direct / kibana) |',
              '|---|---|---|---|---|---|---|---|']
    for c in order_conns:
        d, k = by.get((s, c, 'es')), by.get((s, c, 'kibana'))
        if not d or not k: continue
        lines.append(f"| {c} | {f(d['rps'])} | {f(k['rps'])} | {pct(k['rps'], d['rps'])} | {f(d['p50_ms'])} / {f(d['p99_ms'])} | {f(k['p50_ms'])} / {f(k['p99_ms'])} | {k['kibana_rss_avg_mb']} / {k['kibana_rss_peak_mb']} | {int(d['non2xx']) + int(d['socket_errors'])} / {int(k['non2xx']) + int(k['socket_errors'])} |")
open(os.path.join(out, 'results.md'), 'w').write('\n'.join(lines) + '\n')
print('\n'.join(lines))
PY
echo "Raw wrk output, RSS samples and CSVs are in $OUT_DIR"
