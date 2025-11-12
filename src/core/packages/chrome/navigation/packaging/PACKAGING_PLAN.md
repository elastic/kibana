# External Build Plan for @kbn/core-chrome-navigation

## Overview

This document outlines the steps required to create a standalone, externally-packaged version of the `@kbn/core-chrome-navigation` component, following the pattern established by the Console plugin's "one-console" packaging (commit [513163e](https://github.com/elastic/kibana/commit/513163eea2f09d52b3ae5d948b418d03521d90e0)).

## Current State Analysis

### Dependencies

The Navigation component has the following Kibana dependencies:

1. **@kbn/i18n** - Internationalization utilities (`i18n.translate()`) - **Will be no-op in Phase 1**
2. **@kbn/i18n-react** - React i18n components (`FormattedMessage`) - **Will be no-op in Phase 1**
3. **@kbn/core-chrome-layout-constants** - Constants for main content selectors (`MAIN_CONTENT_SELECTORS`, `APP_MAIN_SCROLL_CONTAINER_ID`) - **Will be removed via refactoring**
4. **@kbn/core-chrome-layout-components** - Used only in Storybook stories (not in production code)

### External Dependencies

- `@elastic/eui` - Elastic UI components
- `@emotion/react` - CSS-in-JS styling
- `react` / `react-dom` - React framework

### Key Differences from Console

1. **Simpler dependency tree**: Navigation has fewer Kibana core dependencies than Console
2. **No service initialization needed**: Navigation doesn't require HTTP, analytics, or other core services
3. **Simplified i18n approach**: Phase 1 will make i18n a no-op (returns default messages), avoiding translation complexity
4. **No Monaco editor**: No complex editor integration required
5. **Layout constants refactoring**: Component needs to be refactored to accept layout constants as props, removing dependency on `@kbn/core-chrome-layout-constants`

## Implementation Phases

This plan is structured in three phases:

- **Phase 1**: Initial standalone build with i18n as no-op (consumers provide their own labels)
- **Phase 2**: Evaluate and create shared build infrastructure (`@kbn/external-package-builder`)
- **Phase 3**: Future enhancement to add translation support if needed

---

## Phase 1: Standalone Build with No-Op i18n

### Overview

Phase 1 creates a minimal standalone build where i18n functions return default messages. Consumers are expected to provide their own navigation item labels, making translations unnecessary for the initial release.

**Important**: This packaging is for **external consumers only**. Kibana will continue to use the Navigation component directly from `@kbn/core-chrome-navigation`. The `OneNavigation` package is specifically for non-Kibana applications.

### Phase 1.1: Refactor Navigation Component to Accept Layout Constants

**This is a core refactoring that must happen before packaging.**

The Navigation component currently imports `MAIN_CONTENT_SELECTORS` and `APP_MAIN_SCROLL_CONTAINER_ID` from `@kbn/core-chrome-layout-constants`. To make it standalone, we need to:

1. **Add layout constants to NavigationProps**

**File: [`src/core/packages/chrome/navigation/src/components/navigation.tsx`](https://github.com/elastic/kibana/blob/main/src/core/packages/chrome/navigation/src/components/navigation.tsx)**

```tsx
// Default values matching Kibana's constants for backward compatibility
const DEFAULT_MAIN_CONTENT_SELECTORS = ['main', '[role="main"]', '#app-content'];
const DEFAULT_MAIN_SCROLL_CONTAINER_ID = 'app-content';

export interface NavigationProps {
  // ... existing props ...
  
  /**
   * CSS selectors for the main content area (used for focus management).
   * Defaults to ['main', '[role="main"]', '#app-content'] if not provided.
   * These defaults match Kibana's MAIN_CONTENT_SELECTORS for backward compatibility.
   */
  mainContentSelectors?: string[];
  
  /**
   * ID of the main scroll container (used for skip links).
   * Defaults to 'app-content' if not provided.
   * This default matches Kibana's APP_MAIN_SCROLL_CONTAINER_ID for backward compatibility.
   */
  mainScrollContainerId?: string;
}
```

2. **Update `focus_main_content.ts` to accept selectors as parameter**

**File: [`src/core/packages/chrome/navigation/src/utils/focus_main_content.ts`](https://github.com/elastic/kibana/blob/main/src/core/packages/chrome/navigation/src/utils/focus_main_content.ts)**

```tsx
// Remove direct import
// import { MAIN_CONTENT_SELECTORS } from '@kbn/core-chrome-layout-constants';

// Default selectors matching Kibana's constants
const DEFAULT_MAIN_CONTENT_SELECTORS = ['main', '[role="main"]', '#app-content'];

/**
 * Utility function for focusing the main content area.
 * @param selectors - CSS selectors for the main content area.
 *                   Defaults to ['main', '[role="main"]', '#app-content'] if not provided.
 */
export const focusMainContent = (selectors: string[] = DEFAULT_MAIN_CONTENT_SELECTORS) => {
  const mainElement = document.querySelector(selectors.join(','));

  if (mainElement instanceof HTMLElement) {
    mainElement.focus();
  }
};
```

3. **Update Navigation component to use props**

**File: [`src/core/packages/chrome/navigation/src/components/navigation.tsx`](https://github.com/elastic/kibana/blob/main/src/core/packages/chrome/navigation/src/components/navigation.tsx)**

```tsx
// Default values matching Kibana's constants
const DEFAULT_MAIN_CONTENT_SELECTORS = ['main', '[role="main"]', '#app-content'];
const DEFAULT_MAIN_SCROLL_CONTAINER_ID = 'app-content';

export const Navigation = ({
  activeItemId,
  isCollapsed: isCollapsedProp,
  items,
  logo,
  onItemClick,
  setWidth,
  sidePanelFooter,
  mainContentSelectors = DEFAULT_MAIN_CONTENT_SELECTORS,
  mainScrollContainerId = DEFAULT_MAIN_SCROLL_CONTAINER_ID,
  ...rest
}: NavigationProps) => {
  // ... existing code ...
  
  // Pass selectors to focusMainContent when needed
  // Update any references to APP_MAIN_SCROLL_CONTAINER_ID to use mainScrollContainerId prop
};
```

4. **No Kibana usage changes needed**

**Important**: Kibana will **not** use the `OneNavigation` package. Kibana continues to import Navigation directly:

```tsx
// Kibana continues to use the component directly
import { Navigation } from '@kbn/core-chrome-navigation';

// Kibana keeps using @kbn/core-chrome-layout-constants
import { MAIN_CONTENT_SELECTORS, APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';
```

The refactoring adds optional props with defaults, so Kibana's existing usage continues to work unchanged. No updates to Kibana code are required.

**Default Values:**
- `mainContentSelectors` defaults to `['main', '[role="main"]', '#app-content']`
- `mainScrollContainerId` defaults to `'app-content'`
- These defaults match Kibana's `MAIN_CONTENT_SELECTORS` and `APP_MAIN_SCROLL_CONTAINER_ID` constants for backward compatibility

**Benefits of this approach:**
- Removes dependency on `@kbn/core-chrome-layout-constants` from the component
- Makes the component more flexible and reusable
- Backward compatible (defaults match Kibana's constants, so existing behavior is preserved)
- Consumers can customize selectors for their application structure
- No breaking changes for Kibana usage (defaults ensure same behavior)

### Phase 1.2: Update Component Usage for Layout Constants

**After Phase 1.1 refactoring, update all call sites:**

1. **Update `focus_main_content` usage throughout Navigation component**
   - All calls to `focusMainContent()` need to pass the `mainContentSelectors` prop
   - Example: `focusMainContent(mainContentSelectors)` instead of `focusMainContent()`

2. **Update references to `APP_MAIN_SCROLL_CONTAINER_ID`**
   - In Navigation component, replace any hardcoded references with `mainScrollContainerId` prop
   - In Storybook stories ([`src/core/packages/chrome/navigation/src/__stories__/navigation.stories.tsx`](https://github.com/elastic/kibana/blob/main/src/core/packages/chrome/navigation/src/__stories__/navigation.stories.tsx)):
     - Remove import: `import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';`
     - Either pass the prop explicitly or rely on default values
   - In `EuiSkipLink` usage, pass `destinationId={mainScrollContainerId}` 

3. **Verify i18n usage patterns**
   - All `i18n.translate()` calls must have `defaultMessage` option (required for no-op to work)
   - All `FormattedMessage` components must have `defaultMessage` prop
   - Check that no i18n calls use advanced features (pluralization, complex formatting) that the no-op doesn't support
   - No changes needed to existing i18n usage - webpack aliases handle the redirection

4. **No Kibana integration changes needed**
   - Kibana continues to use Navigation component directly (not OneNavigation package)
   - Defaults preserve existing behavior, no breaking changes
   - See Phase 1.1 step 4 for details

### Phase 1.3: Create Packaging Directory Structure

1. **Create packaging directory**
   
   Create the following structure under [`src/core/packages/chrome/navigation/`](https://github.com/elastic/kibana/tree/main/src/core/packages/chrome/navigation):
   ```
   packaging/
   ├── package.json
   ├── README.md
   ├── webpack.config.js
   ├── tsconfig.txt
   ├── tsconfig.type_check.txt
   ├── react/
   │   ├── index.tsx          # Main standalone component wrapper
   │   ├── types.ts            # TypeScript type definitions
   │   └── services/           # Standalone service implementations
   │       ├── i18n.ts         # No-op i18n implementation
   │       └── index.ts
   └── scripts/
       └── build.sh            # Build script
   ```

### Phase 1.4: Create No-Op i18n Service

**File: `src/core/packages/chrome/navigation/packaging/react/services/i18n.ts`** (new file)

Create a minimal i18n implementation that returns default messages:

```tsx
import React from 'react';

// No-op i18n implementation
// Returns the defaultMessage from i18n.translate() calls
// Consumers provide their own labels via navigation items, so translations aren't needed

/**
 * No-op i18n.translate function that returns default messages
 */
export const translate = (id: string, options?: { defaultMessage?: string; values?: any }) => {
  return options?.defaultMessage || id;
};

/**
 * No-op FormattedMessage component that renders default message
 */
export const FormattedMessage = ({ 
  id, 
  defaultMessage,
  values,
}: { 
  id: string; 
  defaultMessage?: string;
  values?: Record<string, any>;
}) => {
  return <>{defaultMessage || id}</>;
};

/**
 * No-op I18nProvider that simply renders children
 */
export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

/**
 * Initialize the no-op i18n system
 * This is called by the OneNavigation wrapper
 */
export const initializeI18n = () => {
  // No initialization needed for no-op implementation
  // The webpack aliases will redirect imports to this file
};
```

**Implementation Strategy**: Use webpack aliases to redirect `@kbn/i18n` and `@kbn/i18n-react` imports to this no-op implementation file. This approach:
- Keeps the Navigation component code unchanged
- Provides drop-in replacements for all i18n functions
- Maintains type compatibility
- Results in smallest bundle size

### Phase 1.5: Create OneNavigation Component Wrapper

**File: `src/core/packages/chrome/navigation/packaging/react/index.tsx`** (new file)

Create the `OneNavigation` component for external applications:

```tsx
import React from 'react';
import { Navigation, type NavigationProps } from '../../src/components/navigation';

// Re-export NavigationProps for consumers
export type { NavigationProps };

// OneNavigationProps is identical to NavigationProps
// mainContentSelectors and mainScrollContainerId are already included after refactoring
export type OneNavigationProps = NavigationProps;

/**
 * OneNavigation - Standalone Navigation component for external applications.
 * 
 * This component provides Elastic's navigation UI for non-Kibana applications.
 * i18n is handled automatically via webpack aliases that redirect
 * @kbn/i18n and @kbn/i18n-react to no-op implementations.
 * 
 * @example
 * ```tsx
 * <OneNavigation
 *   items={navigationItems}
 *   logo={logoConfig}
 *   isCollapsed={false}
 *   activeItemId="dashboard"
 *   onItemClick={handleClick}
 *   setWidth={setWidth}
 *   mainContentSelectors={['main', '#app-content']}  // Optional
 *   mainScrollContainerId="app-content"              // Optional
 * />
 * ```
 */
export const OneNavigation = (props: OneNavigationProps) => {
  // No wrapper needed - Navigation component uses i18n which is
  // aliased to no-op implementation via webpack
  return <Navigation {...props} />;
};

// Re-export Navigation directly as well for flexibility
export { Navigation };
```

**Note**: The wrapper is minimal because:
1. Webpack aliases handle i18n redirection transparently
2. Layout constants are now props (no context needed)
3. No additional setup or initialization required
4. Consumers get a clean, simple API

### Phase 1.6: Create Webpack Configuration

**File: `src/core/packages/chrome/navigation/packaging/webpack.config.js`** (new file)

Based on Console's webpack config ([`src/platform/plugins/shared/console/packaging/webpack.config.js`](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/console/packaging/webpack.config.js)), but simplified:

```javascript
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const kibanaRoot = path.resolve(__dirname, '../../../../../..');
const entry = require.resolve('./react/index.tsx');
const outputPath = process.env.BUILD_OUTPUT_DIR || path.resolve(__dirname, '../target');
const mode = process.env.NODE_ENV || 'production';

module.exports = {
  mode,
  entry,
  context: path.dirname(entry),
  devtool: 'source-map',
  
  output: {
    libraryTarget: 'commonjs',
    path: outputPath,
    filename: 'index.js',
    publicPath: 'auto',
  },
  
  target: 'web',
  
  // Externalize peer dependencies
  externals: {
    '@elastic/eui': 'commonjs @elastic/eui',
    '@emotion/css': 'commonjs @emotion/css',
    '@emotion/react': 'commonjs @emotion/react',
    'react': 'commonjs react',
    'react-dom': 'commonjs react-dom',
  },
  
  module: {
    rules: [
      {
        test: /\.(js|tsx?)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            babelrc: false,
            envName: mode,
            presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
        sideEffects: true,
      },
    ],
  },
  
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.css'],
    
    // CRITICAL: Alias @kbn/i18n imports to our no-op implementation
    alias: {
      // Redirect all @kbn/i18n imports to our no-op i18n service
      '@kbn/i18n$': path.resolve(__dirname, 'react/services/i18n.ts'),
      '@kbn/i18n/react': path.resolve(__dirname, 'react/services/i18n.ts'),
      '@kbn/i18n-react': path.resolve(__dirname, 'react/services/i18n.ts'),
    },
  },
  
  optimization: {
    minimize: false,
    noEmitOnErrors: true,
  },
  
  plugins: [
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: ['**/*'],
      dangerouslyAllowCleanPatternsOutsideProject: true,
    }),
  ],
};
```

**Key Decisions**:
1. **i18n Strategy**: Use webpack `resolve.alias` to redirect `@kbn/i18n` imports to no-op implementation
   - Cleanest approach, no runtime overhead
   - Smallest bundle size (no unused i18n code)
   - Transparent to Navigation component code
2. **No SCSS**: Navigation uses CSS-in-JS via Emotion, so no SCSS loaders needed
3. **No code splitting**: Single bundle for simplicity

### Phase 1.7: Create Build Scripts

**File: `src/core/packages/chrome/navigation/packaging/scripts/build.sh`** (new file)

```bash
#!/bin/bash

# Exit on any error
set -e

# Default output directory
OUTPUT_DIR="${1:-$(pwd)/../target}"

# Convert to absolute path if relative
if [[ ! "$OUTPUT_DIR" = /* ]]; then
  OUTPUT_DIR="$(pwd)/$OUTPUT_DIR"
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "Building to output directory: $OUTPUT_DIR"

# Get Kibana root
KIBANA_ROOT="$(cd ../../../../../.. && pwd)"
PACKAGING_DIR="$(pwd)"

echo "Step 1: Building JavaScript and CSS with webpack..."
cd "$KIBANA_ROOT"
NODE_ENV=production BUILD_OUTPUT_DIR="$OUTPUT_DIR" \
  yarn webpack --config src/core/packages/chrome/navigation/packaging/webpack.config.js

echo "Step 2: Generating TypeScript definitions..."
cd "$PACKAGING_DIR"
npx tsc \
  --declaration \
  --emitDeclarationOnly \
  --outFile "$OUTPUT_DIR/index.d.ts" \
  --skipLibCheck \
  --jsx react \
  --esModuleInterop \
  react/index.tsx

echo "Step 3: Copying package.json..."
cp package.json "$OUTPUT_DIR/package.json"

echo "Build complete! Files generated in: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR/"
```

**File: `scripts/build_one_navigation.sh`** (new file - Kibana root level convenience script):

```bash
#!/bin/bash

# Convenience script to build one-navigation bundle
# Calls the actual build script in the navigation packaging directory

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIBANA_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_SCRIPT="$KIBANA_ROOT/src/core/packages/chrome/navigation/packaging/scripts/build.sh"

# Check if build script exists
if [[ ! -f "$BUILD_SCRIPT" ]]; then
  echo "Error: Build script not found at $BUILD_SCRIPT"
  exit 1
fi

echo "Building @kbn/one-navigation..."

# Change to the build script directory and run it
cd "$(dirname "$BUILD_SCRIPT")"
./build.sh "$@"

echo "✓ Build complete"
```

Make scripts executable:
```bash
chmod +x src/core/packages/chrome/navigation/packaging/scripts/build.sh
chmod +x scripts/build_one_navigation.sh
```

### Phase 1.8: Create Package Manifest

**File: `src/core/packages/chrome/navigation/packaging/package.json`** (new file)

```json
{
  "name": "@kbn/one-navigation",
  "version": "1.0.0",
  "description": "Standalone Elastic Navigation component for external React applications",
  "license": "Elastic License 2.0 OR AGPL-3.0-only OR SSPL-1.0",
  "main": "../target/index.js",
  "types": "../target/index.d.ts",
  "peerDependencies": {
    "@elastic/eui": "102.2.0",
    "@emotion/css": "^11.11.0",
    "@emotion/react": "^11.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "keywords": [
    "elastic",
    "navigation",
    "sidebar",
    "menu",
    "react"
  ]
}
```

**Version Strategy Notes**:
- `@elastic/eui`: Exact version (no caret) to ensure compatibility with Navigation's usage
- `@emotion/*`: Caret allows minor updates (EUI's peer dependency)
- `react/react-dom`: Caret allows flexibility for consumers
- Package version `1.0.0` follows semantic versioning; bump as needed

### Phase 1.9: TypeScript Configuration

**Files to create:**
- `src/core/packages/chrome/navigation/packaging/tsconfig.txt` (new file) - For webpack build
- `src/core/packages/chrome/navigation/packaging/tsconfig.type_check.txt` (new file) - For type checking

**Approach:**
- Follow the pattern established by `one-console` packaging
- Reference Console's tsconfig files: [`src/platform/plugins/shared/console/packaging/tsconfig.txt`](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/console/packaging/tsconfig.txt) and [`tsconfig.type_check.txt`](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/console/packaging/tsconfig.type_check.txt)
- Include necessary kbn_references:
  - `@kbn/i18n` (for types only, implementation will be no-op)
  - `@kbn/i18n-react` (for types only)
- **Note**: `@kbn/core-chrome-layout-constants` is no longer needed after Phase 1.1 refactoring

### Phase 1.10: Documentation

**File: `src/core/packages/chrome/navigation/packaging/README.md`** (new file)

Document:
- What is OneNavigation (`@kbn/one-navigation`)
- Target audience: **External applications only** (not for Kibana)
- Key features (self-contained, no Kibana dependencies, customizable)
- Installation instructions
- Usage examples with code samples
- API reference for all props
- Layout constants configuration (`mainContentSelectors` and `mainScrollContainerId`)
- Note that translations are not supported in Phase 1 (internal UI uses English default messages)
- Troubleshooting common issues
- Link to Phase 2 plan for translation support

Document the refactoring changes:
- Why the change was made (to enable standalone packaging for external consumers)
- **Kibana impact**: None - Kibana continues using Navigation component directly
- How the refactoring maintains backward compatibility
- Optional props with sensible defaults

### Phase 1.11: Test External Build

Create a comprehensive test environment to validate the OneNavigation package.

**Build Output Location:**
After running the build scripts, the package artifacts will be in:
- **Output directory**: `src/core/packages/chrome/navigation/target/`
- **Contents**: `index.js`, `index.d.ts`, `package.json`, source maps

**Testing Steps:**

1. **Create test app** (outside Kibana repo)
   ```bash
   npx create-react-app test-one-navigation --template typescript
   cd test-one-navigation
   ```

2. **Install dependencies**
   ```bash
   npm install @elastic/eui@102.2.0 @emotion/react @emotion/css
   # Link to local build for testing (adjust path as needed)
   npm link <KIBANA_ROOT>/src/core/packages/chrome/navigation/target
   ```

3. **Create comprehensive test implementation**

   **File: `src/App.tsx`**
   ```tsx
   import React, { useState } from 'react';
   import { OneNavigation } from '@kbn/one-navigation';
   import { EuiProvider, EuiButton, EuiSpacer, EuiText } from '@elastic/eui';
   import '@elastic/eui/dist/eui_theme_light.css';
   import type { MenuItem, SecondaryMenuItem, SideNavLogo } from '@kbn/one-navigation';
   
   function App() {
     const [navigationWidth, setNavigationWidth] = useState(0);
     const [isCollapsed, setIsCollapsed] = useState(false);
     const [activeItemId, setActiveItemId] = useState('dashboard');
   
     // Define navigation structure
     const navigationItems = {
       primaryItems: [
         {
           id: 'dashboard',
           label: 'Dashboard',
           iconType: 'dashboardApp',
           href: '#/dashboard',
         },
         {
           id: 'analytics',
           label: 'Analytics',
           iconType: 'graphApp',
           href: '#/analytics',
           sections: [
             {
               id: 'reports-section',
               label: 'Reports',
               items: [
                 {
                   id: 'analytics-overview',
                   label: 'Overview',
                   href: '#/analytics',
                 },
                 {
                   id: 'sales-report',
                   label: 'Sales Report',
                   href: '#/analytics/sales',
                 },
                 {
                   id: 'traffic-report',
                   label: 'Traffic Report',
                   href: '#/analytics/traffic',
                 },
               ],
             },
             {
               id: 'metrics-section',
               label: 'Metrics',
               items: [
                 {
                   id: 'performance',
                   label: 'Performance',
                   href: '#/analytics/performance',
                 },
               ],
             },
           ],
         },
         {
           id: 'data',
           label: 'Data',
           iconType: 'database',
           href: '#/data',
           sections: [
             {
               id: 'data-section',
               items: [
                 {
                   id: 'data-sources',
                   label: 'Data Sources',
                   href: '#/data/sources',
                 },
                 {
                   id: 'data-quality',
                   label: 'Data Quality',
                   href: '#/data/quality',
                 },
               ],
             },
           ],
         },
       ],
       footerItems: [
         {
           id: 'settings',
           label: 'Settings',
           iconType: 'gear',
           href: '#/settings',
         },
       ],
     };
   
     const logo: SideNavLogo = {
       id: 'home',
       label: 'My Application',
       iconType: 'logoElastic',
       href: '#/',
     };
   
     const handleItemClick = (item: MenuItem | SecondaryMenuItem | SideNavLogo) => {
       console.log('Navigation item clicked:', item);
       setActiveItemId(item.id);
       
       // Prevent default link behavior for demo
       if (item.href) {
         window.history.pushState({}, '', item.href);
       }
     };
   
     return (
       <EuiProvider colorMode="light">
         <div style={{ display: 'flex', minHeight: '100vh' }}>
           <OneNavigation
             items={navigationItems}
             logo={logo}
             isCollapsed={isCollapsed}
             activeItemId={activeItemId}
             onItemClick={handleItemClick}
             setWidth={setNavigationWidth}
             mainContentSelectors={['main', '[role="main"]']}
             mainScrollContainerId="app-content"
           />
           
           <main 
             id="app-content" 
             role="main"
             style={{ 
               flex: 1, 
               padding: '24px',
               marginLeft: `${navigationWidth}px`,
               transition: 'margin-left 0.3s ease'
             }}
           >
             <EuiText>
               <h1>OneNavigation Test Application</h1>
               <p>Current active item: <strong>{activeItemId}</strong></p>
               <p>Navigation width: <strong>{navigationWidth}px</strong></p>
               <p>Collapsed: <strong>{isCollapsed ? 'Yes' : 'No'}</strong></p>
             </EuiText>
             
             <EuiSpacer />
             
             <EuiButton onClick={() => setIsCollapsed(!isCollapsed)}>
               Toggle Navigation {isCollapsed ? 'Expanded' : 'Collapsed'}
             </EuiButton>
             
             <EuiSpacer />
             
             <EuiText>
               <h2>Test Cases</h2>
               <ul>
                 <li>Click navigation items to see state updates</li>
                 <li>Toggle collapsed state</li>
                 <li>Hover over collapsed items to see popovers</li>
                 <li>Test nested navigation items (Analytics, Data)</li>
                 <li>Click footer items (Settings)</li>
                 <li>Verify responsive behavior (resize window)</li>
                 <li>Check console for errors</li>
               </ul>
             </EuiText>
           </main>
         </div>
       </EuiProvider>
     );
   }
   
   export default App;
   ```

4. **Run and verify**
   ```bash
   npm start
   ```

5. **Comprehensive verification checklist**
   - ✅ Component renders without errors
   - ✅ Navigation structure displays correctly (primary items, footer items)
   - ✅ Logo is clickable and triggers callback
   - ✅ Primary items are clickable and update active state
   - ✅ Nested items expand/collapse properly (Analytics, Data sections)
   - ✅ Secondary menu items work correctly
   - ✅ Footer items are functional (Settings)
   - ✅ Toggle between collapsed/expanded states works smoothly
   - ✅ Collapsed state shows popovers on hover
   - ✅ Active item highlighting works (visual feedback)
   - ✅ `setWidth` callback receives correct navigation width
   - ✅ Main content area adjusts to navigation width
   - ✅ Custom layout constants work (`mainContentSelectors`, `mainScrollContainerId`)
   - ✅ i18n shows default English messages (e.g., "More" menu if overflow)
   - ✅ No console errors about missing dependencies
   - ✅ No console warnings from React
   - ✅ Styles render correctly (Emotion CSS-in-JS)
   - ✅ Responsive behavior works (try mobile viewport)
   - ✅ Bundle size is reasonable (<200KB uncompressed JavaScript)
   - ✅ TypeScript types are available and correct

6. **Test edge cases**
   - Resize window to trigger responsive menu
   - Add many items to test overflow/"More" menu
   - Test with empty sections
   - Test with deeply nested navigation
   - Test rapid clicking/state changes
   - Test with no active item
   - Test with invalid active item ID

### Phase 1 Implementation Considerations

**Backward Compatibility**
- Refactoring adds optional props with defaults matching Kibana's constants
- **Kibana usage unchanged**: Kibana continues using Navigation component directly (not OneNavigation)
- All existing Kibana functionality preserved
- OneNavigation package is exclusively for external consumers

**Testing Strategy**
1. **Unit tests**: 
   - Test Navigation component with layout constants as props
   - Test default values match Kibana constants
   - Test `focusMainContent` with custom selectors
2. **Integration tests**: 
   - Test Navigation in Kibana context (continues to work unchanged)
   - Test OneNavigation wrapper with no-op i18n
   - Test with custom layout constants
3. **Storybook**: Update stories to demonstrate both Kibana and standalone usage
4. **E2E tests**: Verify OneNavigation works in external React app with custom selectors

**Dependencies to Bundle vs Externalize**

**Bundle (include in webpack):**
- Navigation component code (after refactoring)
- Utility functions and hooks
- No-op i18n implementations

**Externalize (peer dependencies):**
- `@elastic/eui` - Large, version-specific
- `@emotion/react` - Styling library
- `react` / `react-dom` - Framework dependencies

**Handle specially:**
- `@kbn/i18n` / `@kbn/i18n-react` - Provide no-op shims that match the API
- `@kbn/core-chrome-layout-constants` - **No longer needed** - removed via refactoring in Phase 1.1


### Phase 1 Success Criteria

1. ✅ Standalone Navigation component can be imported in external React app
2. ✅ No Kibana runtime dependencies required
3. ✅ All existing Navigation functionality works in standalone mode
4. ✅ Backward compatible with Kibana usage
5. ✅ i18n calls return default messages (no-op behavior)
6. ✅ Layout constants can be customized
7. ✅ Build process is automated and documented
8. ✅ TypeScript definitions are generated correctly
9. ✅ Consumers can provide their own navigation item labels

---

## Phase 2: Shared Build Infrastructure

### Overview

After completing Phase 1 for `one-navigation`, both `one-console` and `one-navigation` will share significant commonalities that should be extracted into reusable tooling. Phase 2 focuses on creating shared infrastructure to reduce duplication and accelerate future external package development.

**Timing**: Implement Phase 2 after Phase 1 is complete and validated. This ensures the shared tooling is based on real, working implementations rather than speculation.

### Common Patterns Identified

1. **Directory structure**: Both use `packaging/` with `react/`, `scripts/`, and build configs
2. **Build scripts**: Similar bash scripts for webpack + TypeScript definitions
3. **Webpack configuration**: Common patterns for externals, babel-loader, source maps
4. **TypeScript configs**: Similar tsconfig files for build and type checking
5. **i18n handling**: Both need i18n handling (one-console uses full i18n, one-navigation uses no-op)
6. **Testing approach**: Similar external test app validation

### Phase 2.1: Create `@kbn/external-package-builder`

**Recommended approach**: Create a shared build utilities package.

**Structure:**

```
packages/kbn-external-package-builder/
├── templates/
│   ├── webpack.base.config.js       # Base webpack config to extend
│   ├── build.base.sh                # Reusable build script template
│   └── tsconfig.template.json       # Base TypeScript config
├── scripts/
│   └── create-package.js            # CLI to scaffold new external package
└── utils/
    ├── i18n-noop.ts                 # Shared no-op i18n utilities
    └── build-helpers.js             # Common build functions
```

**Key Components:**

1. **Base Webpack Configuration** (`webpack.base.config.js`)
   - Exports a factory function that accepts package-specific config
   - Handles common patterns: externals, babel-loader, source maps, output
   - Allows overrides for package-specific needs

2. **Reusable Build Script** (`build.base.sh`)
   - Parameterized script that handles webpack build + TypeScript definitions
   - Accepts configuration via environment variables or flags
   - Includes error handling and validation

3. **Shared No-Op i18n** (`utils/i18n-noop.ts`)
   - Single implementation used by all packages needing no-op i18n
   - Consistent behavior across packages
   - Easier to maintain and test

4. **Package Scaffolding CLI** (`scripts/create-package.js`)
   - Automates creation of new external packages
   - Creates directory structure, webpack config, build scripts
   - Enforces best practices and consistency

### Phase 2.2: Migrate `one-navigation` to Use Shared Tooling

**File: `src/core/packages/chrome/navigation/packaging/webpack.config.js`** (modified - simplified)

```javascript
const { createExternalPackageConfig } = require('@kbn/external-package-builder');

module.exports = createExternalPackageConfig({
  entry: './react/index.tsx',
  externals: ['@elastic/eui', '@emotion/css', '@emotion/react', 'react', 'react-dom'],
  aliases: {
    '@kbn/i18n$': '@kbn/external-package-builder/utils/i18n-noop',
    '@kbn/i18n/react': '@kbn/external-package-builder/utils/i18n-noop',
    '@kbn/i18n-react': '@kbn/external-package-builder/utils/i18n-noop',
  },
});
```

**File: `src/core/packages/chrome/navigation/packaging/scripts/build.sh`** (modified - simplified)

```bash
#!/bin/bash
set -e

# Use shared build script
KIBANA_ROOT="$(cd ../../../../../.. && pwd)"
"$KIBANA_ROOT/node_modules/@kbn/external-package-builder/scripts/build-package.sh" \
  --webpack-config "$(pwd)/../webpack.config.js" \
  --package-json "$(pwd)/../package.json" \
  --output "${1:-$(pwd)/../target}"
```

**Benefits:**
- Dramatically simpler package-specific configs
- Single source of truth for common build logic
- Easier maintenance (fix once, benefits all packages)

### Phase 2.3: Migrate `one-console` to Use Shared Tooling

Apply the same pattern to Console packaging:

1. Replace custom webpack config with factory function call
2. Simplify build script to use shared utilities
3. Migrate to shared no-op i18n (if applicable, or use full i18n utilities)

**Note**: Console may have more complex requirements (Monaco workers, etc.) so shared tooling should allow for overrides.

### Phase 2.4: Create Shared No-Op i18n Package

**Alternative approach**: Instead of embedding in `@kbn/external-package-builder`, create a separate package.

**Structure:**

```
packages/kbn-i18n-noop/
├── package.json
├── index.ts
└── README.md
```

**File: `packages/kbn-i18n-noop/index.ts`** (new file)

```typescript
import React from 'react';

/**
 * No-op i18n.translate function that returns default messages
 */
export const translate = (id: string, options?: { defaultMessage?: string; values?: any }) => {
  return options?.defaultMessage || id;
};

/**
 * No-op FormattedMessage component that renders default message
 */
export const FormattedMessage = ({ 
  id, 
  defaultMessage,
  values,
}: { 
  id: string; 
  defaultMessage?: string;
  values?: Record<string, any>;
}) => {
  return <>{defaultMessage || id}</>;
};

/**
 * No-op I18nProvider that simply renders children
 */
export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

// Export as default i18n object for compatibility
export const i18n = {
  translate,
};
```

**Usage in webpack configs:**

```javascript
alias: {
  '@kbn/i18n': '@kbn/i18n-noop',
  '@kbn/i18n-react': '@kbn/i18n-noop',
}
```

**Benefits:**
- Reusable across all external packages
- Can be updated independently
- Simpler testing and maintenance
- Could potentially be published as standalone package

### Phase 2.5: Documentation and Guidelines

Create comprehensive documentation for the shared build infrastructure:

**File: `packages/kbn-external-package-builder/README.md`** (new file)

Document:
- How to create a new external package using the CLI
- How to customize webpack config for specific needs
- How to override defaults
- Best practices for external packages
- Examples from one-console and one-navigation

**File: `docs/external-packages/GUIDE.md`** (new file in Kibana root)

Document:
- When to create an external package
- Architecture decisions and trade-offs
- Dependency management strategies
- Testing approaches
- Publishing workflow

### Phase 2.6: Create Scaffolding CLI

**File: `packages/kbn-external-package-builder/scripts/create-package.js`** (new file)

CLI tool to scaffold new external packages:

```bash
# Interactive mode
yarn create-external-package

# With arguments
yarn create-external-package one-layout \
  --entry src/index.tsx \
  --externals "@elastic/eui,react,react-dom" \
  --description "Standalone grid layout package"
```

**Generated structure:**

```
packages/kbn-one-layout/
├── packaging/
│   ├── package.json              # Generated with correct metadata
│   ├── webpack.config.js         # Extends base config
│   ├── tsconfig.txt
│   ├── tsconfig.type_check.txt
│   ├── react/
│   │   └── index.tsx             # Template entry point
│   ├── scripts/
│   │   └── build.sh              # Uses shared script
│   └── README.md                 # Generated documentation
└── README.md                      # Package overview
```

### Phase 2 Implementation Considerations

**Don't Over-Abstract Too Early:**
- Wait until both one-console and one-navigation are working
- Extract commonalities based on actual needs, not predicted ones
- Keep package-specific complexity in the packages themselves

**Keep Escape Hatches:**
- Packages should be able to override shared configs when needed
- Don't force everything into the shared tooling
- Factory functions should accept overrides

**Prioritize Developer Experience:**
- Clear error messages
- Good documentation
- Examples for common scenarios
- Make it easier to do the right thing

### Phase 2 Success Criteria

1. ✅ `@kbn/external-package-builder` package created and tested
2. ✅ `one-navigation` migrated to use shared tooling
3. ✅ `one-console` migrated to use shared tooling (or plan documented)
4. ✅ Shared no-op i18n package created
5. ✅ Scaffolding CLI functional
6. ✅ Documentation complete
7. ✅ Creating new external packages takes < 1 hour
8. ✅ Build configuration complexity reduced by >50%

### Future External Packages

With Phase 2 complete, creating new external packages becomes straightforward:

**Examples of future packages:**
- `@kbn/one-layout` - Standalone grid layout component
- `@kbn/one-chrome` - Chrome UI components (headers, banners)
- `@kbn/one-advanced-settings` - Advanced settings UI
- `@kbn/one-forms` - Reusable form components

**Workflow:**

```bash
# 1. Scaffold package
yarn create-external-package one-layout

# 2. Customize webpack config if needed
# Edit packages/kbn-one-layout/packaging/webpack.config.js

# 3. Build
yarn build-external-package one-layout

# 4. Test
cd test-app && npm link ../kibana/packages/kbn-one-layout/target
```

---

## Phase 3: Translation Support Enhancement (Future)

### Overview

Phase 3 adds full translation support to the standalone Navigation component, allowing consumers to provide translations for internal UI strings (like "More" menu label) while still allowing custom labels for navigation items.

**Timing**: Implement Phase 3 based on consumer feedback and demand. Phase 1 (no-op i18n) may be sufficient for most use cases.

### Phase 3.1: Enhanced i18n Service

**File: `src/core/packages/chrome/navigation/packaging/react/services/i18n.ts`** (modified - enhanced)

Replace no-op implementation with full i18n support:

```tsx
import { i18n } from '@kbn/i18n';

export interface TranslationConfig {
  locale: string;
  messages: Record<string, string>;
  formats?: Record<string, any>;
}

export const initializeI18n = (config?: TranslationConfig) => {
  if (config) {
    i18n.init({
      locale: config.locale,
      messages: config.messages,
      formats: config.formats,
    });
  } else {
    // Fallback to no-op if no config provided
    // (maintains Phase 1 behavior)
  }
};

// Support for multiple languages
export const loadTranslations = async (locale: string) => {
  // Load translation files for the specified locale
  // Similar to Console's approach
};
```

### Phase 3.2: Translation Extraction

Similar to Console's approach:
- Extract translation strings with prefix `core.ui.chrome.sideNavigation.*`
- Generate translation JSON files for supported languages (en, fr-FR, ja-JP, zh-CN, de-DE)
- Include in build output or provide as separate package

**File: `src/core/packages/chrome/navigation/packaging/scripts/extract_translations.sh`** (new file)

```bash
# Extract translations from Navigation component
# Generate JSON files for each supported language
```

### Phase 3.3: Enhanced OneNavigation Component

**File: `src/core/packages/chrome/navigation/packaging/react/index.tsx`** (modified - enhanced)

```tsx
export interface OneNavigationProps extends NavigationProps {
  lang?: string;
  translations?: TranslationConfig;
  // Note: mainContentSelectors and mainScrollContainerId are already part of NavigationProps
}

export const OneNavigation = ({
  lang = 'en',
  translations,
  ...navigationProps
}: OneNavigationProps) => {
  React.useEffect(() => {
    if (translations) {
      initializeI18n(translations);
    } else if (lang) {
      // Load translations for the specified language
      loadTranslations(lang).then((translationConfig) => {
        initializeI18n(translationConfig);
      });
    } else {
      // Fallback to no-op (Phase 1 behavior)
      initializeI18n();
    }
  }, [lang, translations]);

  return (
    <I18nProvider>
      <Navigation {...navigationProps} />
    </I18nProvider>
  );
};
```

### Phase 3.4: Update Build Process

**File: `src/core/packages/chrome/navigation/packaging/scripts/build.sh`** (modified - enhanced)

Add translation extraction step:
1. Extract translations
2. Generate translation JSON files
3. Run webpack build
4. Generate TypeScript definitions
5. Copy translation files to output

### Phase 3.5: Update Documentation

**File: `src/core/packages/chrome/navigation/packaging/README.md`** (modified - enhanced)

Add sections on:
- Translation setup
- Supported languages
- How to provide custom translations
- Translation key reference

### Phase 3 Implementation Considerations

**Backward Compatibility with Phase 1**
- Phase 3 must maintain Phase 1's no-op behavior if no translations provided
- Consumers using Phase 1 API should continue to work unchanged

**Translation Scope**
- Only translate internal UI strings (e.g., "More" menu label)
- Navigation item labels remain consumer-provided (via props)
- This keeps the API simple while allowing UI localization


### Phase 3 Success Criteria

1. ✅ Translations can be provided via props or loaded from files
2. ✅ Multiple languages supported (en, fr-FR, ja-JP, zh-CN, de-DE)
3. ✅ Phase 1 behavior maintained (no-op if no translations)
4. ✅ Translation extraction automated
5. ✅ Documentation updated with translation examples
6. ✅ Backward compatible with Phase 1 API

---

## Comparison with Console Packaging

| Aspect | Console | Navigation Phase 1 | Navigation Phase 2 | Navigation Phase 3 |
|--------|---------|-------------------|---------------------|---------------------|
| **Complexity** | High (Monaco, HTTP, services) | Low (UI component only) | Low (shared tooling) | Medium (adds translations) |
| **Services needed** | HTTP, Analytics, Theme, i18n, DocLinks | i18n (no-op) | i18n (no-op) | i18n (full) |
| **Special handling** | Monaco workers, parser | Layout constants refactoring | Shared build utils | Layout constants + translations |
| **Translation extraction** | Yes | No | No | Yes |
| **Build output size** | Large (~MB) | Small (~KB) | Small (~KB) | Small-Medium (~KB) |
| **External dependencies** | Many | Few | Few | Few |
| **Shared infrastructure** | No | No | Yes (creates it) | Yes (uses it) |

## Risks and Mitigations

1. **Risk**: Breaking existing Navigation usage in Kibana
   - **Mitigation**: 
     - Use optional props with defaults matching current behavior
     - Kibana usage unchanged (continues using Navigation directly)
     - Extensive testing of default values

2. **Risk**: Layout constants refactoring breaking existing code
   - **Mitigation**: 
     - Provide sensible defaults that match Kibana's constants
     - No Kibana code changes needed (defaults preserve behavior)
     - Extensive testing to ensure backward compatibility

3. **Risk**: i18n no-op implementation complexity
   - **Mitigation**: Simple shim that returns defaultMessage, well-tested

4. **Risk**: Bundle size concerns
   - **Mitigation**: Externalize large dependencies, tree-shaking, code splitting if needed

5. **Risk**: Phase 3 breaking Phase 1/2 consumers
   - **Mitigation**: Maintain backward compatibility, no-op as default behavior

6. **Risk**: Phase 2 shared tooling too rigid
   - **Mitigation**: Provide override mechanisms, keep escape hatches, document customization patterns

---

## Next Steps

### Phase 1 (In Progress)

**Completed:**
- ✅ **Phase 1.1** - Refactored Navigation component to accept layout constants as props
- ✅ **Phase 1.2** - Updated all component usage for layout constants
- ✅ **Phase 1.3** - Created packaging directory structure

**Next Steps:**
1. **Phase 1.4** - Create no-op i18n service
2. **Phase 1.5** - Create OneNavigation component wrapper
3. **Phase 1.6** - Create Webpack configuration
4. **Phase 1.7** - Create build scripts
5. **Phase 1.8** - Create package manifest
6. **Phase 1.9** - TypeScript configuration
7. **Phase 1.10** - Documentation
8. **Phase 1.11** - Test external build
9. Test Phase 1 thoroughly with external test application
10. Validate with real-world usage

### Phase 2 (After Phase 1 Complete)

1. Evaluate commonalities between `one-console` and `one-navigation`
2. Design `@kbn/external-package-builder` API based on actual needs
3. Create shared build infrastructure
4. Migrate `one-navigation` to use shared tooling
5. Plan migration for `one-console`
6. Document patterns and create scaffolding CLI

### Phase 3 (Based on Demand)

1. Gather feedback from Phase 1 consumers about translation needs
2. If translation support is required, implement Phase 3
3. Maintain backward compatibility with Phase 1 API
4. Provide migration guide for consumers who want translations

