#!/usr/bin/env bash

print_disk_usage() {
  local measurement="${1:-current}"
  local path
  local filesystems=(. "${HOME}")
  local paths=(
    node_modules
    .pnpm-store
    .moon/cache
    target
    .es
    "${HOME}/.cache/kibana"
    /dev/shm/pnpm-store
    "${HOME}/.cache"
    "${HOME}/.kibana"
  )

  if [[ -d /dev/shm ]]; then
    filesystems+=(/dev/shm)
  fi

  echo "--- Disk usage: ${measurement}"
  df -h "${filesystems[@]}" | awk 'NR == 1 || !seen[$1]++' || true

  for path in "${paths[@]}"; do
    if [[ -e "$path" ]]; then
      du -sh "$path" || true
    fi
  done
}
