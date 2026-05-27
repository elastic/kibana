# Sourced by ftr_configs.sh — do not execute directly.
# Reads globals: exitCode, retry_recovered, annotation_rows, failure_detail_lines,
# JOB, BUILDKITE_RETRY_COUNT, BUILDKITE_COMMIT.

# Diffs the JUnit XML directory against a pre-run snapshot and prints failing test names.
collect_config_failures() {
  local xml_before="$1"
  local tmp_xml_after new_xmls tmp_junit
  tmp_xml_after=$(mktemp)
  find "target/junit/${JOB}" -maxdepth 1 -name "*.xml" 2>/dev/null | sort > "$tmp_xml_after" || true
  new_xmls=$(comm -13 "$xml_before" "$tmp_xml_after" 2>/dev/null | grep -v '^[[:space:]]*$' || true)
  rm -f "$tmp_xml_after"
  [[ -z "$new_xmls" ]] && return
  tmp_junit=$(mktemp -d)
  while IFS= read -r f; do
    [[ -n "$f" ]] && cp "$f" "$tmp_junit/" 2>/dev/null || true
  done <<< "$new_xmls"
  node scripts/ftr_check_retry_result list-failures "$tmp_junit" 2>/dev/null || true
  rm -rf "$tmp_junit"
}

write_job_annotation() {
  local attempt_num style
  attempt_num=$((${BUILDKITE_RETRY_COUNT:-0} + 1))
  style=$([[ "$exitCode" == "0" ]] && echo "success" || echo "error")

  {
    echo "### FTR Configs — \`${JOB}\` (attempt ${attempt_num})"
    echo ""

    if [[ "$retry_recovered" == "true" ]]; then
      echo "**Recovered on retry** — all originally-failing tests passed; step marked green."
      echo ""
      echo "> Configs shown as 'still failing' below introduced *new* failures on retry that were not part of the original failure set and are not counted against recovery."
      echo ""
    fi

    if [[ ${#annotation_rows[@]} -gt 0 ]]; then
      echo "| Config | Duration | Status |"
      echo "| --- | --- | --- |"
      printf "%s\n" "${annotation_rows[@]}"
    fi

    if [[ ${#failure_detail_lines[@]} -gt 0 ]]; then
      echo ""
      printf "%s\n" "${failure_detail_lines[@]}"
    fi
  } | buildkite-agent annotate \
        --scope job \
        --context "ftr-summary" \
        --style "${style}" || true
}
