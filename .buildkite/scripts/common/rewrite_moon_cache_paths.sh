#!/usr/bin/env bash

escape_sed_replace() {
  printf '%s' "$1" | sed 's/[&\\]/\\&/g'
}

detect_moon_cache_source_path() {
  local cache_dir="$1"

  if [[ -f "$cache_dir/.buildkite-checkout-path" ]]; then
    tr -d '\n' <"$cache_dir/.buildkite-checkout-path"
    return 0
  fi

  grep -roh '/opt/buildkite-agent/builds/[^/[:space:]"]*/elastic/[^/[:space:]"]*/kibana' "$cache_dir" 2>/dev/null \
    | head -1 \
    || true
}

rewrite_moon_cache_paths() {
  local cache_dir="${1:-.moon/cache}"
  local target_path="${2:-$(pwd)}"

  if [[ ! -d "$cache_dir" ]]; then
    return 0
  fi

  local source_path="${MOON_CACHE_SOURCE_PATH:-$(detect_moon_cache_source_path "$cache_dir")}"
  rm -f "$cache_dir/.buildkite-checkout-path"

  if [[ -z "$source_path" ]]; then
    echo "Could not detect moon cache source path, skipping rewrite"
    return 0
  fi

  source_path="${source_path%/}"
  target_path="${target_path%/}"

  if [[ "$source_path" == "$target_path" ]]; then
    echo "Moon cache source path matches target, skipping rewrite"
    return 0
  fi

  local source_escaped target_escaped
  source_escaped=$(escape_sed_replace "$source_path")
  target_escaped=$(escape_sed_replace "$target_path")

  echo "Rewriting moon cache paths: $source_path -> $target_path"

  local start_time parallelism file_count
  start_time=$(date +%s)
  parallelism="${MOON_CACHE_REWRITE_PARALLELISM:-$(nproc 2>/dev/null || echo 4)}"

  local -a files=()
  while IFS= read -r -d '' file; do
    files+=("$file")
  done < <(
    find "$cache_dir" -type f \
      ! -name '*.tar.gz' \
      ! -name '*.tar.zst' \
      ! -name '*.gz' \
      ! -name '*.zst' \
      ! -name '*.lock' \
      -print0
  )

  file_count=${#files[@]}
  if [[ "$file_count" -eq 0 ]]; then
    echo "No moon cache files to rewrite"
    return 0
  fi

  printf '%s\0' "${files[@]}" | xargs -0 -P "$parallelism" sed -i "s|${source_escaped}|${target_escaped}|g"

  local elapsed=$(( $(date +%s) - start_time ))
  echo "Rewrote paths in ${file_count} files (${elapsed}s)"
}
