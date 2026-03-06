#!/usr/bin/env bash
# Extracts data-test-subj selectors from a Cypress test and its imported screens files,
# then checks which selectors still exist in application source code.
#
# Usage:
#   bash .agents/skills/cypress-to-scout-migration/scripts/extract_selectors.sh \
#     <cypress-test-file> --app-src <path-to-plugin-source>
#
# Output: list of selectors with existence status (FOUND / MISSING)

set -euo pipefail

APP_SRC=""
TEST_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-src)
      APP_SRC="$2"
      shift 2
      ;;
    *)
      TEST_FILE="$1"
      shift
      ;;
  esac
done

if [[ -z "$TEST_FILE" ]]; then
  echo "Usage: $0 <cypress-test-file> --app-src <path-to-plugin-source>"
  echo ""
  echo "  --app-src  Path to the plugin source directory to search for selectors"
  exit 1
fi

if [[ -z "$APP_SRC" ]]; then
  echo "Error: --app-src is required (e.g., --app-src x-pack/solutions/security/plugins/security_solution)"
  exit 1
fi

if [[ ! -f "$TEST_FILE" ]]; then
  echo "Error: File not found: $TEST_FILE"
  exit 1
fi

TEST_DIR=$(dirname "$TEST_FILE")

# Walk up to find the cypress root (directory containing 'screens' folder)
CYPRESS_ROOT="$TEST_DIR"
while [[ ! -d "${CYPRESS_ROOT}/screens" && "$CYPRESS_ROOT" != "/" ]]; do
  CYPRESS_ROOT=$(dirname "$CYPRESS_ROOT")
done

if [[ ! -d "${CYPRESS_ROOT}/screens" ]]; then
  echo "Warning: Could not find cypress/screens/ directory"
  CYPRESS_ROOT="$TEST_DIR"
fi

# Collect imported files (screens and tasks)
collect_imported_files() {
  local source_file="$1"
  local pattern="$2"
  local source_dir
  source_dir=$(dirname "$source_file")

  grep "from '" "$source_file" 2>/dev/null | grep "$pattern" | while read -r line; do
    import_path=$(echo "$line" | sed -n "s/.*from ['\"]\\([^'\"]*\\)['\"].*/\\1/p")
    if [[ -n "$import_path" ]]; then
      resolved="${source_dir}/${import_path}.ts"
      if [[ -f "$resolved" ]]; then
        echo "$resolved"
      fi
    fi
  done
}

SCREEN_FILES=()
TASK_FILES=()

# Collect screens imported by the test
while IFS= read -r f; do
  [[ -n "$f" ]] && SCREEN_FILES+=("$f")
done < <(collect_imported_files "$TEST_FILE" "screens")

# Collect tasks imported by the test
while IFS= read -r f; do
  [[ -n "$f" ]] && TASK_FILES+=("$f")
done < <(collect_imported_files "$TEST_FILE" "tasks")

# Collect screens imported by tasks
for task_file in "${TASK_FILES[@]}"; do
  while IFS= read -r f; do
    [[ -n "$f" ]] && SCREEN_FILES+=("$f")
  done < <(collect_imported_files "$task_file" "screens")
done

# Deduplicate
SCREEN_FILES=($(printf '%s\n' "${SCREEN_FILES[@]}" | sort -u))

ALL_FILES=("$TEST_FILE" "${SCREEN_FILES[@]}" "${TASK_FILES[@]}")

# Extract data-test-subj values from all files
SELECTORS=""
for f in "${ALL_FILES[@]}"; do
  if [[ -f "$f" ]]; then
    # data-test-subj="value"
    vals=$(grep -oE 'data-test-subj="[^"]+"' "$f" 2>/dev/null | sed 's/data-test-subj="//;s/"//' || true)
    SELECTORS="${SELECTORS}${vals:+$'\n'}${vals}"

    # getDataTestSubjectSelector('value')
    vals=$(grep -oE "getDataTestSubjectSelector\(['\"][^'\"]+['\"]\)" "$f" 2>/dev/null | sed "s/getDataTestSubjectSelector(['\"]//;s/['\"])//" || true)
    SELECTORS="${SELECTORS}${vals:+$'\n'}${vals}"

    # getDataTestSubjectSelectorStartWith('value')
    vals=$(grep -oE "getDataTestSubjectSelectorStartWith\(['\"][^'\"]+['\"]\)" "$f" 2>/dev/null | sed "s/getDataTestSubjectSelectorStartWith(['\"]//;s/['\"])//" || true)
    SELECTORS="${SELECTORS}${vals:+$'\n'}${vals}"
  fi
done

ALL_SELECTORS=$(echo "$SELECTORS" | sort -u | grep -v '^$' || true)

if [[ -z "$ALL_SELECTORS" ]]; then
  echo "No data-test-subj selectors found in test or its imports."
  exit 0
fi

echo "=== Selector Analysis ==="
echo "Test file: $TEST_FILE"
echo "Screen files: ${SCREEN_FILES[*]:-none}"
echo "Task files: ${TASK_FILES[*]:-none}"
echo ""
echo "--- Selectors ---"

FOUND=0
MISSING=0

while IFS= read -r selector; do
  [[ -z "$selector" ]] && continue

  # Skip dynamic selectors (contain ${...})
  if echo "$selector" | grep -q '\$'; then
    echo "  DYNAMIC  $selector"
    continue
  fi

  # Search in app source (not test files)
  if grep -rq "${selector}" "$APP_SRC" --include='*.ts' --include='*.tsx' --exclude-dir='test' --exclude-dir='__tests__' --exclude='*.test.*' --exclude='*.spec.*' 2>/dev/null; then
    echo "  FOUND    $selector"
    FOUND=$((FOUND + 1))
  else
    echo "  MISSING  $selector"
    MISSING=$((MISSING + 1))
  fi
done <<< "$ALL_SELECTORS"

TOTAL=$(echo "$ALL_SELECTORS" | wc -l | tr -d ' ')
echo ""
echo "Summary: ${FOUND} found, ${MISSING} missing, ${TOTAL} total"

if [[ $MISSING -gt 0 ]]; then
  echo ""
  echo "WARNING: Missing selectors may indicate removed features or renamed test-subj attributes."
  echo "Verify each MISSING selector before migration."
fi
