#!/bin/bash

cd /Users/timschnell/workspace/kibana

echo "Directories owned by @elastic/kibana-data-discovery that contain tests:"
echo "========================================================================"
echo ""

while IFS= read -r dir; do
  # Skip files (those ending with extensions)
  if [[ "$dir" == *.ts ]] || [[ "$dir" == *.js ]] || [[ "$dir" == *.json ]]; then
    continue
  fi
  
  # Check if directory exists
  if [ -d "$dir" ]; then
    # Look for test files in the directory
    test_files=$(find "$dir" -type f \( -name "*.test.ts" -o -name "*.test.js" -o -name "*.spec.ts" -o -name "*.spec.js" \) 2>/dev/null | wc -l)
    
    if [ "$test_files" -gt 0 ]; then
      echo "✓ $dir ($test_files test files)"
      echo "  Sample test files:"
      find "$dir" -type f \( -name "*.test.ts" -o -name "*.test.js" -o -name "*.spec.ts" -o -name "*.spec.js" \) 2>/dev/null | head -5 | sed 's/^/    /'
      echo ""
    fi
  fi
done < /tmp/data_discovery_dirs.txt
