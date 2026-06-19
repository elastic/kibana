#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

.buildkite/scripts/bootstrap.sh

# Optionally back target/types with a tmpfs RAM disk to speed up emit I/O.
# Enable by setting KBN_TYPECHECK_RAMDISK_SIZE (e.g. "4G") on the CI step.
# The mount path is exported as KBN_TYPECHECK_RAMDISK so the type_check CLI
# symlinks each project's target/types into it.
if [ -n "${KBN_TYPECHECK_RAMDISK_SIZE:-}" ]; then
  echo --- Mount tmpfs for typecheck emit
  KBN_TYPECHECK_RAMDISK="${KBN_TYPECHECK_RAMDISK:-/mnt/kibana-types}"
  sudo mkdir -p "$KBN_TYPECHECK_RAMDISK"
  # Idempotent: skip if already mounted (e.g. retried step on the same agent).
  if ! mountpoint -q "$KBN_TYPECHECK_RAMDISK"; then
    sudo mount -t tmpfs -o "size=${KBN_TYPECHECK_RAMDISK_SIZE},uid=$(id -u),gid=$(id -g)" \
      tmpfs "$KBN_TYPECHECK_RAMDISK"
  fi
  export KBN_TYPECHECK_RAMDISK
  echo "tmpfs mounted at $KBN_TYPECHECK_RAMDISK ($KBN_TYPECHECK_RAMDISK_SIZE)"
  df -h "$KBN_TYPECHECK_RAMDISK"
fi

echo --- Check Types

args=()
if [ -n "${RESTORE_ARCHIVE:-}" ]; then
  args+=(--restore-archive)
fi
if [ -n "${UPLOAD_ARCHIVE:-}" ]; then
  args+=(--upload-archive)
fi

node scripts/type_check "${args[@]}"
