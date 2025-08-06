#!/bin/bash

cd /Users/timschnell/workspace/kibana

echo "React Testing Library Conversion Candidates"
echo "=========================================="
echo ""

# Read the directories from our previous analysis
directories=(
  "src/platform/packages/shared/kbn-content-management-utils"
  "src/platform/packages/shared/kbn-data-service"
  "src/platform/packages/shared/kbn-data-view-utils"
  "src/platform/packages/shared/kbn-data-view-validation"
  "src/platform/packages/shared/kbn-datemath"
  "src/platform/packages/shared/kbn-discover-contextual-components"
  "src/platform/packages/shared/kbn-discover-utils"
  "src/platform/packages/shared/kbn-es-query"
  "src/platform/packages/shared/kbn-field-types"
  "src/platform/packages/shared/kbn-field-utils"
  "src/platform/packages/shared/kbn-resizable-layout"
  "src/platform/packages/shared/kbn-search-response-warnings"
  "src/platform/packages/shared/kbn-unified-data-table"
  "src/platform/packages/shared/kbn-unified-field-list"
  "src/platform/packages/shared/kbn-unified-histogram"
  "src/platform/packages/shared/kbn-unified-tabs"
  "src/platform/plugins/shared/data"
  "src/platform/plugins/shared/data_view_editor"
  "src/platform/plugins/shared/data_view_field_editor"
  "src/platform/plugins/shared/data_view_management"
  "src/platform/plugins/shared/data_views"
  "src/platform/plugins/shared/discover"
  "src/platform/plugins/shared/discover/public/context_awareness/profile_providers/common/deprecation_logs"
  "src/platform/plugins/shared/discover/public/context_awareness/profile_providers/observability"
  "src/platform/plugins/shared/discover/public/context_awareness/profile_providers/security"
  "src/platform/plugins/shared/field_formats"
  "src/platform/plugins/shared/saved_objects_finder"
  "src/platform/plugins/shared/saved_search"
  "src/platform/plugins/shared/unified_doc_viewer"
  "x-pack/platform/plugins/private/discover_enhanced"
)

# Function to check if a test file is a candidate for RTL conversion
check_test_file() {
  local file="$1"
  local patterns_found=""
  
  # Check for enzyme patterns
  if grep -l "import.*enzyme\|from.*enzyme" "$file" >/dev/null 2>&1; then
    patterns_found="${patterns_found}enzyme "
  fi
  
  # Check for shallow/mount patterns
  if grep -l "\.shallow\|\.mount\|shallow(" "$file" >/dev/null 2>&1; then
    patterns_found="${patterns_found}shallow/mount "
  fi
  
  # Check for React component testing patterns
  if grep -l "render.*React\|ReactDOM\.render\|TestRenderer" "$file" >/dev/null 2>&1; then
    patterns_found="${patterns_found}react-rendering "
  fi
  
  # Check for component testing without RTL
  if grep -l "\.find(\|\.prop(\|\.state(\|\.instance(" "$file" >/dev/null 2>&1; then
    patterns_found="${patterns_found}component-querying "
  fi
  
  # Check if it's NOT already using RTL
  if ! grep -l "@testing-library/react\|render.*from.*@testing-library" "$file" >/dev/null 2>&1; then
    if [ -n "$patterns_found" ]; then
      echo "$file ($patterns_found)"
    fi
  fi
}

# Search through each directory
for dir in "${directories[@]}"; do
  if [ -d "$dir" ]; then
    echo "Checking $dir..."
    test_files=$(find "$dir" -type f \( -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.test.js" -o -name "*.test.jsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" -o -name "*.spec.js" -o -name "*.spec.jsx" \) 2>/dev/null)
    
    candidates_found=false
    for test_file in $test_files; do
      result=$(check_test_file "$test_file")
      if [ -n "$result" ]; then
        if [ "$candidates_found" = false ]; then
          echo "  Conversion candidates in $dir:"
          candidates_found=true
        fi
        echo "    $result"
      fi
    done
    
    if [ "$candidates_found" = false ]; then
      echo "  No obvious RTL conversion candidates found"
    fi
    echo ""
  fi
done
