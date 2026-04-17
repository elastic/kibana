#!/bin/bash
# ---------------------------------------------------------------------------
# kbn-shared — spin up Kibana + Elasticsearch for both serverless and stateful
#
# Run this from the ROOT of your kibana repo checkout.
#
# Optional environment variables (export before running):
#   KBN_LOG_DIR           Directory for log files.
#                         Default: ./logs/kbn-dev
#   KBN_INFERENCE_URL     Elastic inference service URL.
#                         Default: (none — omitted from ES flags)
#
# Flags:
#   --clean               Wipe .es/cache and run `yarn kbn clean` before boot.
#
# Prerequisites:
#   - Node.js (nvm is detected automatically if installed)
#   - yarn (ships with the kibana repo via corepack/volta/etc.)
#   - Docker running (required by `yarn es`)
#   - Google Chrome installed (used for incognito windows; falls back to
#     macOS `open` / Linux `xdg-open` if Chrome isn't found)
#   - Ports 5601, 5611, 9200, 9201, 9300, 9301 must be free
# ---------------------------------------------------------------------------

# --- Repo root check -------------------------------------------------------
if [ ! -f "package.json" ] || ! grep -q '"name": "kibana"' package.json 2>/dev/null; then
  echo "ERROR: This script must be run from the root of the kibana repo."
  echo "  cd /path/to/kibana && ./path/to/kbn-shared"
  exit 1
fi
KBN_DIR="$(pwd)"

# --- Node / nvm setup ------------------------------------------------------
if [ -z "$(command -v node)" ]; then
  if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
  fi
fi

ensure_node() {
  if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    nvm use 2>/dev/null
  fi
}

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is not available. Install Node.js or nvm, then retry."
  exit 1
fi

# --- Browser detection ------------------------------------------------------
detect_browser() {
  if [[ "$OSTYPE" == darwin* ]]; then
    if [ -d "/Applications/Google Chrome.app" ]; then
      echo "chrome-mac"
    else
      echo "open-mac"
    fi
  elif command -v google-chrome >/dev/null 2>&1; then
    echo "chrome-linux"
  elif command -v chromium-browser >/dev/null 2>&1; then
    echo "chromium-linux"
  elif command -v xdg-open >/dev/null 2>&1; then
    echo "xdg-open"
  else
    echo "none"
  fi
}

open_browser() {
  local url="$1"
  local profile_dir="$2"
  local browser
  browser=$(detect_browser)

  case "$browser" in
    chrome-mac)
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
        --incognito --user-data-dir="$profile_dir" "$url" 2>/dev/null &
      ;;
    open-mac)
      open "$url" &
      ;;
    chrome-linux)
      google-chrome --incognito --user-data-dir="$profile_dir" "$url" 2>/dev/null &
      ;;
    chromium-linux)
      chromium-browser --incognito --user-data-dir="$profile_dir" "$url" 2>/dev/null &
      ;;
    xdg-open)
      xdg-open "$url" 2>/dev/null &
      ;;
    *)
      echo "WARNING: No browser detected. Open $url manually."
      return 1
      ;;
  esac
  echo $!
}

# --- Parse flags ------------------------------------------------------------
CLEAN_CACHE=false
for arg in "$@"; do
  case $arg in
    --clean) CLEAN_CACHE=true; shift ;;
    *) ;;
  esac
done

# --- Logging ----------------------------------------------------------------
LOG_DIR="${KBN_LOG_DIR:-$KBN_DIR/logs/kbn-dev}"
mkdir -p "$LOG_DIR"

# --- Kill previous instance -------------------------------------------------
PIDFILE="$LOG_DIR/kbn_shared.pid"
if [ -f "$PIDFILE" ]; then
  OLD_PID=$(cat "$PIDFILE" 2>/dev/null)
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Killing previous kbn-shared instance (PID $OLD_PID) and its children..."
    pkill -P "$OLD_PID" 2>/dev/null || true
    kill "$OLD_PID" 2>/dev/null || true
    sleep 2
  fi
fi
echo $$ > "$PIDFILE"

# --- PID tracking -----------------------------------------------------------
OPTIMIZER_PID=""
ESSLS_PID=""
ESSTACK_PID=""
KBNSLS_PID=""
KBNSTACK_PID=""
SLS_CHROME_PID=""
STACK_CHROME_PID=""

# --- Cleanup on exit --------------------------------------------------------
cleanup() {
  echo ""
  echo "Stopping all processes..."
  for pid in $OPTIMIZER_PID $ESSLS_PID $ESSTACK_PID $KBNSLS_PID $KBNSTACK_PID $SLS_CHROME_PID $STACK_CHROME_PID; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      echo "  Killing PID $pid"
      kill "$pid" 2>/dev/null || true
    fi
  done

  if command -v docker >/dev/null 2>&1; then
    echo "Cleaning up ES Docker containers..."
    docker ps -q --filter "name=es" --filter "name=elasticsearch" 2>/dev/null | while read -r cid; do
      [ -n "$cid" ] && docker stop "$cid" 2>/dev/null && docker rm "$cid" 2>/dev/null
    done
  fi

  rm -f "$PIDFILE"
  echo "Cleanup complete."
  exit
}
trap cleanup SIGINT SIGTERM

ESSLS_LOG="$LOG_DIR/essls.log"
ESSTACK_LOG="$LOG_DIR/esstack.log"
KBNSLS_LOG="$LOG_DIR/kbnsls.log"
KBNSTACK_LOG="$LOG_DIR/kbnstack.log"
OPTIMIZER_LOG="$LOG_DIR/optimizer.log"
MAIN_LOG="$LOG_DIR/main.log"
rm -f "$ESSLS_LOG" "$ESSTACK_LOG" "$KBNSLS_LOG" "$KBNSTACK_LOG" "$OPTIMIZER_LOG" "$MAIN_LOG"
touch "$ESSLS_LOG" "$ESSTACK_LOG" "$KBNSLS_LOG" "$KBNSTACK_LOG" "$OPTIMIZER_LOG" "$MAIN_LOG"

log_step() {
  local msg="$1"
  local logfile="${2:-$MAIN_LOG}"
  echo -e "\n[$(date '+%Y-%m-%d %H:%M:%S')] $msg" | tee -a "$logfile"
}

echo "============================================="
echo " kbn-shared: Kibana dual-mode dev launcher"
echo "============================================="
echo "  Repo:     $KBN_DIR"
echo "  Logs:     $LOG_DIR"
echo "  Clean:    $CLEAN_CACHE"
echo "============================================="

# --- Kill stale processes on known ports ------------------------------------
log_step "Clearing stale processes on dev ports..."
for port in 9200 9201 9300 9301 5601 5611; do
  pid=$(lsof -ti "tcp:$port" 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "  Killing PID $pid on port $port"
    kill -9 "$pid" 2>/dev/null || true
  fi
done

# --- Optional cache clean ---------------------------------------------------
if [ "$CLEAN_CACHE" = true ]; then
  log_step "Cleaning ES cache (.es/cache)..."
  rm -rf "$KBN_DIR/.es/cache/"
else
  log_step "Skipping ES cache clean (use --clean to enable)"
fi

# --- Build inference flag ---------------------------------------------------
INFERENCE_FLAG=""
if [ -n "$KBN_INFERENCE_URL" ]; then
  INFERENCE_FLAG="-E xpack.inference.elastic.url=$KBN_INFERENCE_URL"
fi

# ===== PHASE 1: Start Elasticsearch clusters in parallel ====================

log_step "Starting ES Serverless..." "$ESSLS_LOG"
(
  cd "$KBN_DIR" || exit 1
  ensure_node
  # shellcheck disable=SC2086
  yarn es serverless \
    --projectType elasticsearch_general_purpose \
    --clean --kill \
    $INFERENCE_FLAG
) >> "$ESSLS_LOG" 2>&1 &
ESSLS_PID=$!

log_step "Starting ES Stateful (snapshot)..." "$ESSTACK_LOG"
(
  cd "$KBN_DIR" || exit 1
  ensure_node
  # shellcheck disable=SC2086
  yarn es snapshot \
    --license trial --clean \
    -E http.port=9201 \
    -E transport.port=9301 \
    -E xpack.ml.enabled=false \
    $INFERENCE_FLAG
) >> "$ESSTACK_LOG" 2>&1 &
ESSTACK_PID=$!

# ===== PHASE 2: Bootstrap and build optimizer ===============================

(
  cd "$KBN_DIR" || exit 1
  ensure_node
  if [ "$CLEAN_CACHE" = true ]; then
    log_step "Running yarn kbn clean..."
    yarn kbn clean
  fi
  log_step "Running yarn kbn bootstrap..."
  yarn kbn bootstrap
) >> "$MAIN_LOG" 2>&1

log_step "Starting optimizer (watch mode)..."
(
  cd "$KBN_DIR" || exit 1
  ensure_node
  node scripts/build_kibana_platform_plugins --watch
) >> "$OPTIMIZER_LOG" 2>&1 &
OPTIMIZER_PID=$!

log_step "Waiting for optimizer initial build..."
while true; do
  if grep -q "succ.*bundles compiled successfully\|succ all bundles cached" "$OPTIMIZER_LOG" 2>/dev/null; then
    log_step "Optimizer build complete!"
    break
  fi
  sleep 2
done

# ===== PHASE 3: Wait for ES → start Kibana =================================

kill_port() {
  local port="$1"
  local pid
  pid=$(lsof -ti "tcp:$port" 2>/dev/null)
  if [ -n "$pid" ]; then
    log_step "Killing stale process $pid on port $port"
    kill -9 "$pid" 2>/dev/null || true
    sleep 1
  fi
}

start_kbnsls() {
  kill_port 5601
  log_step "Starting Kibana Serverless (port 5601)..." "$KBNSLS_LOG"
  (
    cd "$KBN_DIR" || exit 1
    ensure_node
    export KBN_OPTIMIZER_USE_MAX_AVAILABLE_RESOURCES=false
    yarn serverless-es \
      --server.port=5601 \
      --no-optimizer
  ) >> "$KBNSLS_LOG" 2>&1
}

start_kbnstack() {
  kill_port 5611
  log_step "Starting Kibana Stateful (port 5611)..." "$KBNSTACK_LOG"
  (
    cd "$KBN_DIR" || exit 1
    ensure_node
    export KBN_OPTIMIZER_USE_MAX_AVAILABLE_RESOURCES=false
    yarn start \
      --elasticsearch http://localhost:9201 \
      --server.port=5611 \
      --xpack.security.cookieName=sid-stack \
      --no-optimizer
  ) >> "$KBNSTACK_LOG" 2>&1
}

monitor_process() {
  local name="$1"
  local start_fn="$2"
  local logfile="$3"
  local failures=0
  local max_failures=3

  while true; do
    $start_fn &
    local pid=$!
    wait $pid
    local exit_code=$?

    if [ $exit_code -eq 1 ]; then
      failures=$((failures + 1))
      log_step "$name crashed (attempt $failures/$max_failures)" "$logfile"
      if [ $failures -lt $max_failures ]; then
        log_step "Restarting $name in 5s..."
        sleep 5
      else
        log_step "$name exceeded max retries. Giving up."
        kill $$ 2>/dev/null
        exit 1
      fi
    else
      log_step "$name exited with code $exit_code"
      break
    fi
  done
}

# Serverless pipeline: wait for ES SLS → start Kibana SLS
(
  log_step "Waiting for ES Serverless to be ready..."
  while true; do
    if grep -q "succ Serverless ES cluster running" "$ESSLS_LOG" 2>/dev/null; then
      log_step "ES Serverless is ready!"
      monitor_process "kbnsls" start_kbnsls "$KBNSLS_LOG" &
      echo "$!" > "$LOG_DIR/kbnsls.pid"
      break
    fi
    if ! kill -0 "$ESSLS_PID" 2>/dev/null; then
      log_step "ERROR: ES Serverless process died. Check $ESSLS_LOG"
      break
    fi
    sleep 2
  done
) &

# Stateful pipeline: wait for ES stateful → start Kibana stateful
(
  log_step "Waiting for ES Stateful to be ready..."
  while true; do
    if grep -q "succ ES cluster is ready" "$ESSTACK_LOG" 2>/dev/null; then
      log_step "ES Stateful is ready!"
      monitor_process "kbnstack" start_kbnstack "$KBNSTACK_LOG" &
      echo "$!" > "$LOG_DIR/kbnstack.pid"
      break
    fi
    if ! kill -0 "$ESSTACK_PID" 2>/dev/null; then
      log_step "ERROR: ES Stateful process died. Check $ESSTACK_LOG"
      break
    fi
    sleep 2
  done
) &

# ===== PHASE 4: Wait for Kibana → open browser =============================

log_step "Waiting for Kibana Serverless to become available..."
while true; do
  if grep -q "\[INFO \]\[status\] Kibana is now available" "$KBNSLS_LOG" 2>/dev/null; then
    log_step "Kibana Serverless is available!"
    break
  fi
  sleep 2
done
SLS_CHROME_PID=$(open_browser "http://localhost:5601" "/tmp/kbn-chrome-sls")

log_step "Waiting for Kibana Stateful to become available..."
while true; do
  if grep -q "\[INFO \]\[status\] Kibana is now available" "$KBNSTACK_LOG" 2>/dev/null; then
    log_step "Kibana Stateful is available!"
    break
  fi
  sleep 2
done
STACK_CHROME_PID=$(open_browser "http://localhost:5611" "/tmp/kbn-chrome-stack")

# --- Read child PIDs --------------------------------------------------------
[ -f "$LOG_DIR/kbnsls.pid" ]  && KBNSLS_PID=$(cat "$LOG_DIR/kbnsls.pid")
[ -f "$LOG_DIR/kbnstack.pid" ] && KBNSTACK_PID=$(cat "$LOG_DIR/kbnstack.pid")

# --- Summary ----------------------------------------------------------------
log_step "All processes running:"
echo "  Optimizer PID:        $OPTIMIZER_PID"
echo "  ES Serverless PID:    $ESSLS_PID"
echo "  ES Stateful PID:      $ESSTACK_PID"
echo "  Kibana SLS PID:       $KBNSLS_PID"
echo "  Kibana Stack PID:     $KBNSTACK_PID"
echo "  Chrome SLS PID:       $SLS_CHROME_PID"
echo "  Chrome Stack PID:     $STACK_CHROME_PID"
echo ""
echo "  Kibana Serverless:    http://localhost:5601"
echo "  Kibana Stateful:      http://localhost:5611"
echo ""
echo "============================================="
echo " LOG VIEWER"
echo "============================================="
echo ""
if command -v tmux >/dev/null 2>&1; then
  echo "  Paste this to open all logs in a tmux window:"
  echo ""
  echo "    tmux new-session -d -s kbn-logs -n logs \\"
  echo "      \"tail -f $ESSLS_LOG\" \\; \\"
  echo "      split-window -h \\"
  echo "      \"tail -f $ESSTACK_LOG\" \\; \\"
  echo "      split-window -v \\"
  echo "      \"tail -f $KBNSTACK_LOG\" \\; \\"
  echo "      select-pane -t 0 \\; \\"
  echo "      split-window -v \\"
  echo "      \"tail -f $KBNSLS_LOG\" \\; \\"
  echo "      select-layout tiled \\; \\"
  echo "      attach"
  echo ""
  echo "  To also include the optimizer log (5th pane):"
  echo ""
  echo "    tmux new-session -d -s kbn-logs -n logs \\"
  echo "      \"tail -f $ESSLS_LOG\" \\; \\"
  echo "      split-window -h \\"
  echo "      \"tail -f $ESSTACK_LOG\" \\; \\"
  echo "      split-window -v \\"
  echo "      \"tail -f $KBNSTACK_LOG\" \\; \\"
  echo "      select-pane -t 0 \\; \\"
  echo "      split-window -v \\"
  echo "      \"tail -f $KBNSLS_LOG\" \\; \\"
  echo "      split-window -v \\"
  echo "      \"tail -f $OPTIMIZER_LOG\" \\; \\"
  echo "      select-layout tiled \\; \\"
  echo "      attach"
  echo ""
  echo "  (Detach: Ctrl+B then D | Kill: tmux kill-session -t kbn-logs)"
else
  echo "  Install tmux for a split-pane log viewer, or tail"
  echo "  individually in separate terminals:"
fi
echo ""
echo "  Individual tail commands:"
echo "    tail -f $ESSLS_LOG"
echo "    tail -f $ESSTACK_LOG"
echo "    tail -f $KBNSLS_LOG"
echo "    tail -f $KBNSTACK_LOG"
echo "    tail -f $OPTIMIZER_LOG"
echo ""
echo "============================================="
echo "Press Ctrl+C to stop all processes."

wait