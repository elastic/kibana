#!/usr/bin/env bash
set -euo pipefail

report_main_step () {
  echo "--- $1"
}

main () {
  cd "$PARENT_DIR"

  report_main_step "Cloning repositories"
}

main
