#!/usr/bin/env bash

set -euo pipefail

source .buildkite/scripts/common/util.sh

CACHE_DIR=".buildkite/type-check-cache"
CACHE_PAYLOAD_DIR="$CACHE_DIR/archive"

restore_type_check_cache() {
	if [[ ! -d "$CACHE_PAYLOAD_DIR" ]]; then
		return
	fi

	local cache_entry
	cache_entry=$(find "$CACHE_PAYLOAD_DIR" -mindepth 1 -print -quit 2>/dev/null || true)
	if [[ -z "$cache_entry" ]]; then
		return
	fi

	echo '--- Restoring TypeScript cache'
	rsync -a "$CACHE_PAYLOAD_DIR/" ./
}

persist_type_check_cache() {
	echo '--- Persisting TypeScript cache'
	mkdir -p "$CACHE_PAYLOAD_DIR"
	# Cache the incremental compiler outputs and build info files only.
	rsync -a --delete --prune-empty-dirs \
		--include='*/' \
		--include='target/types/***' \
		--include='*.tsbuildinfo' \
		--exclude='*' \
		./ "$CACHE_PAYLOAD_DIR/"
}

on_exit() {
	local exit_code=$?
	if [[ $exit_code -eq 0 ]]; then
		persist_type_check_cache
	else
		echo '--- Skipping TypeScript cache upload (previous command failed)'
	fi
}

mkdir -p "$CACHE_PAYLOAD_DIR"
trap on_exit EXIT

.buildkite/scripts/bootstrap.sh

restore_type_check_cache

echo --- Check Types
node scripts/type_check
