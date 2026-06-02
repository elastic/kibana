#!/usr/bin/env bash
# Lifecycle wrapper for the worktree's persistent dev Elasticsearch.
#
# Why this exists:
# `yarn es snapshot` deletes `.es/9.5.0/data/` on every run. We've already
# lost ~848MB of AESOP / eval data once (2026-05-04). All ES interactions
# in this worktree MUST go through this script (or `docker compose` directly
# against the compose file in this directory).
#
# Usage:
#   dev-es.sh up        Start ES, wait for healthy
#   dev-es.sh down      Stop ES (data preserved in named volume)
#   dev-es.sh restart   Stop + start
#   dev-es.sh status    Health, indices, container state
#   dev-es.sh logs      Tail ES logs (Ctrl-C to exit)
#   dev-es.sh shell     Open a bash shell inside the container
#   dev-es.sh nuke      DESTROY the data volume (interactive confirm)
#   dev-es.sh backup    Snapshot the data volume to ./backups/<timestamp>.tar.gz
#   dev-es.sh restore <archive>  Restore from a backup tarball

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
COMPOSE_PROJECT="skill-eval-platform-es"
ES_URL="http://localhost:9200"
ES_AUTH="elastic:changeme"
VOLUME_NAME="skill_eval_platform_es_data"
BACKUP_DIR="$SCRIPT_DIR/backups"

# Hard guard: refuse to run if any non-docker `yarn`-managed ES is on 9200.
guard_against_yarn_es() {
  if pgrep -f "node.*scripts/es snapshot" >/dev/null 2>&1; then
    echo "ERROR: yarn-managed 'scripts/es snapshot' process detected."
    echo "  Stop it before running this script (kill it, or wait for it to exit)."
    echo "  Reminder: 'yarn es snapshot' WIPES .es/9.5.0/data/ — use this docker"
    echo "  setup instead. See $SCRIPT_DIR/POSTMORTEM.md."
    exit 1
  fi
}

cmd_up() {
  guard_against_yarn_es
  echo "Bringing up dockerized ES..."
  docker compose -f "$COMPOSE_FILE" up -d
  echo "Waiting for cluster health (yellow or green)..."
  for i in $(seq 1 60); do
    if curl -fs -u "$ES_AUTH" "$ES_URL/_cluster/health?wait_for_status=yellow&timeout=5s" >/dev/null 2>&1; then
      echo "ES is up at $ES_URL (auth: $ES_AUTH)."
      bootstrap_users
      # Defensive: a previous backup that crashed before its trap fired could
      # leave `cluster.routing.allocation.enable=none`, blocking every write.
      # Reset on every up so a restart always restores a writable cluster.
      restore_allocation
      cmd_status
      return 0
    fi
    sleep 2
  done
  echo "ERROR: ES did not become healthy within 120s. See: dev-es.sh logs"
  exit 1
}

# Set passwords for the reserved users that Kibana (and FTRs) expect to find with
# the dev default password 'changeme'. Mirrors what `yarn es snapshot` does via
# kbn-es's NativeRealm. Idempotent: change_password is a no-op if already set.
bootstrap_users() {
  echo "Bootstrapping reserved-user passwords (kibana_system, apm_system, ...)"
  local users=(
    "kibana_system"
    "apm_system"
    "logstash_system"
    "beats_system"
    "remote_monitoring_user"
  )
  for user in "${users[@]}"; do
    local code
    code=$(curl -s -o /dev/null -w "%{http_code}" \
      -u "$ES_AUTH" -X POST -H 'Content-Type: application/json' \
      "$ES_URL/_security/user/$user/_password" \
      -d '{"password":"changeme"}')
    if [[ "$code" == "200" ]]; then
      echo "  $user: password set"
    else
      echo "  $user: HTTP $code (continuing — may already be set or user may not exist)"
    fi
  done

  # Create system_indices_superuser used by FTRs / kbn-es internals.
  # Role first (PUT is idempotent), then user.
  curl -fs -u "$ES_AUTH" -X PUT -H 'Content-Type: application/json' \
    "$ES_URL/_security/role/system_indices_superuser" \
    -d '{
      "cluster": ["all"],
      "indices": [{"names":["*"],"privileges":["all"],"allow_restricted_indices":true}],
      "applications":[{"application":"*","privileges":["*"],"resources":["*"]}],
      "run_as":["*"]
    }' >/dev/null && echo "  role system_indices_superuser: ensured" || echo "  role system_indices_superuser: failed"

  curl -fs -u "$ES_AUTH" -X PUT -H 'Content-Type: application/json' \
    "$ES_URL/_security/user/system_indices_superuser" \
    -d '{
      "password":"changeme",
      "roles":["system_indices_superuser"],
      "full_name":"System Indices Superuser"
    }' >/dev/null && echo "  user system_indices_superuser: ensured" || echo "  user system_indices_superuser: failed"
}

cmd_down() {
  echo "Stopping ES (data volume preserved)..."
  docker compose -f "$COMPOSE_FILE" down
}

cmd_restart() {
  cmd_down
  cmd_up
}

cmd_status() {
  echo "=== Container ==="
  docker compose -f "$COMPOSE_FILE" ps 2>&1 || true
  echo
  echo "=== Cluster health ==="
  curl -fs -u "$ES_AUTH" "$ES_URL/_cluster/health?pretty" 2>&1 || echo "(ES not reachable)"
  echo
  echo "=== Indices (top 20) ==="
  curl -fs -u "$ES_AUTH" "$ES_URL/_cat/indices?v&h=health,status,index,docs.count,store.size&s=index" 2>&1 | head -21 || true
  echo
  echo "=== AESOP / eval indices ==="
  curl -fs -u "$ES_AUTH" "$ES_URL/_cat/indices/.aesop*,kibana-evaluations*?v&h=health,status,index,docs.count,store.size" 2>&1 || true
  echo
  echo "=== Volume ==="
  docker volume inspect "$VOLUME_NAME" --format '{{.Mountpoint}} ({{.Driver}})' 2>&1 || true
}

cmd_logs() {
  docker compose -f "$COMPOSE_FILE" logs -f --tail=100 elasticsearch
}

cmd_shell() {
  docker compose -f "$COMPOSE_FILE" exec elasticsearch bash
}

cmd_nuke() {
  cat <<EOF
WARNING: This will permanently DELETE the ES data volume:
  $VOLUME_NAME

You will lose all AESOP proposed skills, discovered patterns, eval runs,
and any saved objects you've created in this worktree.
EOF
  read -r -p "Type 'NUKE' to confirm: " confirm
  if [[ "$confirm" != "NUKE" ]]; then
    echo "Aborted."
    exit 1
  fi
  cmd_down
  docker volume rm "$VOLUME_NAME" 2>&1 || true
  echo "Volume $VOLUME_NAME deleted."
}

# Re-enable shard allocation. Idempotent; safe to call from a trap.
restore_allocation() {
  curl -fs -u "$ES_AUTH" -X PUT -H 'Content-Type: application/json' \
    "$ES_URL/_cluster/settings" \
    -d '{"transient":{"indices.recovery.max_bytes_per_sec":null,"cluster.routing.allocation.enable":null}}' \
    >/dev/null 2>&1 || true
}

cmd_backup() {
  mkdir -p "$BACKUP_DIR"
  local stamp
  stamp="$(date +%Y%m%d-%H%M%S)"
  local archive="$BACKUP_DIR/es-data-$stamp.tar.gz"
  echo "Backing up volume $VOLUME_NAME -> $archive"

  # Quiesce Lucene merges and flush translog so the on-disk segment files
  # don't move underneath us mid-tar. Without this, tar races with merges
  # and exits non-zero on missing _NN.cfe / _NN.si fragments.
  echo "Flushing indices and pausing merges..."
  curl -fs -u "$ES_AUTH" -X POST "$ES_URL/_flush?wait_if_ongoing=true" >/dev/null 2>&1 || true
  curl -fs -u "$ES_AUTH" -X POST "$ES_URL/_synced_flush" >/dev/null 2>&1 || true
  curl -fs -u "$ES_AUTH" -X PUT -H 'Content-Type: application/json' \
    "$ES_URL/_cluster/settings" \
    -d '{"transient":{"indices.recovery.max_bytes_per_sec":"0","cluster.routing.allocation.enable":"none"}}' >/dev/null 2>&1 || true

  # Trap covers every exit path — tar exit ≥2, signals, curl errors, even
  # `set -e` aborts inside the docker-run pipeline. Without this, a hard
  # failure could leave the cluster pinned at `allocation.enable: none`,
  # which silently breaks every subsequent write until manual intervention.
  trap 'restore_allocation' EXIT INT TERM

  # GNU tar (alpine's busybox tar lacks --warning=). Exit code 1 = "some
  # files differ during read" — harmless here because allocation is frozen
  # and the only churn left is the translog (restore replays it). We
  # capture the return code OUTSIDE the docker-run subshell so `set -e`
  # cannot abort us before the trap fires.
  local rc=0
  docker run --rm \
    -v "$VOLUME_NAME":/data:ro \
    -v "$BACKUP_DIR":/backup \
    debian:stable-slim \
    tar --warning=no-file-changed \
        --warning=no-file-removed \
        -czf "/backup/$(basename "$archive")" \
        -C /data \
        . || rc=$?

  ls -lh "$archive" 2>/dev/null || true

  # Re-run the cleanup eagerly (also covered by trap on exit) so the user
  # sees an unblocked cluster before the post-backup messages.
  restore_allocation
  trap - EXIT INT TERM

  if [[ $rc -eq 0 ]]; then
    echo "Backup complete."
  elif [[ $rc -eq 1 ]]; then
    echo "Backup complete (tar reported file-change warnings; safe — allocation was frozen)."
  else
    echo "ERROR: tar exited with rc=$rc — backup is likely corrupt." >&2
    echo "       Inspect $archive and consider deleting it." >&2
    exit "$rc"
  fi
}

cmd_restore() {
  local archive="${1:-}"
  if [[ -z "$archive" || ! -f "$archive" ]]; then
    echo "Usage: dev-es.sh restore <path-to-backup-tar.gz>"
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/*.tar.gz 2>/dev/null || echo "  (none)"
    exit 1
  fi
  echo "WARNING: This will REPLACE the current ES data volume contents."
  read -r -p "Type 'RESTORE' to confirm: " confirm
  if [[ "$confirm" != "RESTORE" ]]; then
    echo "Aborted."
    exit 1
  fi
  cmd_down
  docker volume rm "$VOLUME_NAME" 2>&1 || true
  docker volume create "$VOLUME_NAME"
  # Match the image used by cmd_backup (GNU tar). Alpine's busybox tar
  # accepts our archives in practice but produces different ownership/xattr
  # behavior on edge cases — keep the tooling symmetric.
  docker run --rm \
    -v "$VOLUME_NAME":/data \
    -v "$(cd "$(dirname "$archive")" && pwd)":/backup:ro \
    debian:stable-slim \
    tar -xzf "/backup/$(basename "$archive")" -C /data
  echo "Restore complete. Run: dev-es.sh up"
}

case "${1:-}" in
  up)       cmd_up ;;
  down)     cmd_down ;;
  restart)  cmd_restart ;;
  status)   cmd_status ;;
  logs)     cmd_logs ;;
  shell)    cmd_shell ;;
  nuke)     cmd_nuke ;;
  backup)   cmd_backup ;;
  restore)  cmd_restore "${2:-}" ;;
  *)
    cat <<EOF
Persistent dev Elasticsearch for skill-eval-platform worktree.

Commands:
  up        Start ES, wait for healthy
  down      Stop ES (data preserved)
  restart   Stop + start
  status    Health, indices, container state
  logs      Tail ES logs
  shell     Bash shell inside the container
  nuke      DESTROY data volume (interactive confirm)
  backup    Snapshot data volume to backups/<timestamp>.tar.gz
  restore <archive>   Restore from a backup tarball

Compose file: $COMPOSE_FILE
Volume:       $VOLUME_NAME
ES URL:       $ES_URL  (auth: $ES_AUTH)

NEVER run 'yarn es snapshot' in this worktree — it wipes data.
See $SCRIPT_DIR/POSTMORTEM.md for context.
EOF
    exit 1
    ;;
esac
