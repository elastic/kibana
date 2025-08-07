#!/bin/bash

# Script to fix RTL test files by adding IntlProvider wrapper

# Array of test files that need IntlProvider fixes
files=(
  "src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/date/date.test.tsx"
  "src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/date_nanos/date_nanos.test.tsx"
  "src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/histogram/histogram.test.tsx"
  "src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/editors/percent/percent.test.tsx"
)

echo "🔧 Fixing RTL test files with IntlProvider wrapper..."

for file in "${files[@]}"
do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    
    # Add IntlProvider import after render import
    sed -i.bak 's/import { render } from/import { render } from/' "$file"
    sed -i.bak '/import { render } from.*@testing-library\/react/a\
import { IntlProvider } from '"'"'react-intl'"'"';' "$file"
    
    # Add renderWithIntl helper before describe block
    sed -i.bak '/const onError = jest\.fn();/a\
\
const renderWithIntl = (component: React.ReactElement) => {\
  return render(\
    <IntlProvider locale="en">\
      {component}\
    </IntlProvider>\
  );\
};' "$file"
    
    # Replace render( calls with renderWithIntl(
    sed -i.bak 's/const { container } = render(/const { container } = renderWithIntl(/g' "$file"
    sed -i.bak 's/render(/renderWithIntl(/g' "$file"
    
    echo "✅ Fixed: $file"
  else
    echo "⚠️  File not found: $file"
  fi
done

echo "🎉 RTL test file fixes completed!"
