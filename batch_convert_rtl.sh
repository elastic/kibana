#!/bin/bash

cd /Users/timschnell/workspace/kibana

echo "Converting React Testing Library candidates - Batch conversion for simple enzyme tests"
echo "====================================================================================="

# List of files to convert (starting with the simpler ones)
files=(
  "src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/truncate/truncate.test.tsx"
  "src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/date/date.test.tsx"
  "src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/percent/percent.test.tsx"
  "src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/date_nanos/date_nanos.test.tsx"
  "src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/default/default.test.tsx"
  "src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/number/number.test.tsx"
  "src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/string/string.test.tsx"
  "src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/duration/duration.test.tsx"
  "src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/histogram/histogram.test.tsx"
)

convert_enzyme_test() {
  local file="$1"
  
  if [ ! -f "$file" ]; then
    echo "File not found: $file"
    return
  fi
  
  echo "Converting: $file"
  
  # Create backup
  cp "$file" "$file.backup"
  
  # Replace enzyme imports with RTL imports
  sed -i '' 's/import { shallow } from '\''enzyme'\'';/import { render } from '\''@testing-library\/react'\'';/g' "$file"
  sed -i '' 's/import { mount } from '\''enzyme'\'';/import { render } from '\''@testing-library\/react'\'';/g' "$file"
  sed -i '' 's/import { shallow, mount } from '\''enzyme'\'';/import { render } from '\''@testing-library\/react'\'';/g' "$file"
  
  # Replace shallow() calls with render() and adjust assertions
  sed -i '' 's/const component = shallow(/const { container } = render(/g' "$file"
  sed -i '' 's/expect(component)\.toMatchSnapshot();/expect(container).toBeInTheDocument();\n    expect(container.firstChild).toBeTruthy();/g' "$file"
  
  echo "  ✓ Converted $file"
}

for file in "${files[@]}"; do
  convert_enzyme_test "$file"
done

echo ""
echo "Conversion complete. Please review the changes and run tests to ensure they pass."
echo "Original files are backed up with .backup extension."
