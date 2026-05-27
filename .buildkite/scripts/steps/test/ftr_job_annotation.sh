# Sourced by ftr_configs.sh — do not execute directly.
# Reads globals: exitCode, retry_recovered, annotation_rows, failure_detail_lines,
# JOB, BUILDKITE_RETRY_COUNT, BUILDKITE_COMMIT.

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
