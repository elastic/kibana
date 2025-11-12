# OneNavigation Roadmap Progress

This document tracks the implementation progress of the `@kbn/one-navigation` package roadmap.

## Phase 1: Standalone Build with No-Op i18n

### Phase 1.1: Refactor Navigation Component to Accept Layout Constants [COMPLETED]

**Completed Changes:**

**Updated `focus_main_content.ts`**
   - Removed direct import of `MAIN_CONTENT_SELECTORS`
   - Added `DEFAULT_MAIN_CONTENT_SELECTORS` constant
   - Updated function to accept `selectors` parameter with default value

****Updated `navigation.tsx`**
   - Added `DEFAULT_MAIN_CONTENT_SELECTORS` and `DEFAULT_MAIN_SCROLL_CONTAINER_ID` constants
   - Added `mainContentSelectors?: string[]` prop to `NavigationProps`
   - Added `mainScrollContainerId?: string` prop to `NavigationProps`
   - Updated component to use props with default values
   - Updated all calls to `focusMainContent()` to pass `mainContentSelectors`

****Updated `navigation.stories.tsx`**
   - Removed import of `APP_MAIN_SCROLL_CONTAINER_ID`
   - Updated `EuiSkipLink` to use hardcoded default value

****Updated `tsconfig.json`**
   - Removed `@kbn/core-chrome-layout-constants` from `kbn_references`

**Benefits:**
- **Removes dependency on `@kbn/core-chrome-layout-constants` from the component
- **Makes the component more flexible and reusable
- **Fully backward compatible (defaults match Kibana's constants)
- **Consumers can customize selectors for their application structure
- **No breaking changes for Kibana usage (defaults ensure same behavior)

### Phase 1.2: Update Component Usage for Layout Constants **COMPLETED

**Completed Changes:**

****Updated `focus_main_content` usage throughout Navigation component**
   - All calls to `focusMainContent()` now pass the `mainContentSelectors` prop
   - Changed from `focusMainContent()` to `focusMainContent(mainContentSelectors)`

****Updated references to `APP_MAIN_SCROLL_CONTAINER_ID`**
   - Navigation component uses `mainScrollContainerId` prop throughout
   - Storybook stories updated
   - Removed import: `import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';`
   - Uses default value

****Verified i18n usage patterns**
   - All `i18n.translate()` calls have `defaultMessage` option
   - All `FormattedMessage` components have `defaultMessage` prop
   - No advanced i18n features that would break no-op implementation
   - Webpack aliases will handle the redirection (configured in Phase 1.6)

****Confirmed no Kibana integration changes needed**
   - Kibana continues to use Navigation component directly (not OneNavigation package)
   - Defaults preserve existing behavior, no breaking changes
   - All existing tests pass without modification

### Phase 1.3: Create Packaging Directory Structure **COMPLETED

**Completed Changes:**

****Created packaging directory structure**
   - `packaging/` directory created under `src/core/packages/chrome/navigation/`
   - All required subdirectories created: `react/`, `react/services/`, `scripts/`

****Created placeholder files**
   - `package.json` - Package manifest with metadata and peer dependencies
   - `README.md` - Documentation placeholder (to be completed in Phase 1.10)
   - `webpack.config.js` - Webpack configuration placeholder (to be completed in Phase 1.6)
   - `tsconfig.txt` - TypeScript build config placeholder (to be completed in Phase 1.9)
   - `tsconfig.type_check.txt` - TypeScript type check config placeholder (to be completed in Phase 1.9)
   - `react/index.tsx` - Component wrapper placeholder (to be completed in Phase 1.5)
   - `react/types.ts` - Type definitions placeholder
   - `react/services/i18n.tsx` - No-op i18n placeholder (to be completed in Phase 1.4)
   - `react/services/index.ts` - Service exports
   - `scripts/build.sh` - Build script placeholder (to be completed in Phase 1.7)

****Made build script executable**
   - `chmod +x` applied to `scripts/build.sh`

### Phase 1.4: Create No-Op i18n Service **COMPLETED

**Completed Changes:**

****Implemented `react/services/i18n.tsx` with full no-op i18n**
   - `translate()` function - returns `defaultMessage` or `id` if no default provided
   - `FormattedMessage` component - renders `defaultMessage` or `id`
   - `I18nProvider` component - pass-through wrapper that renders children
   - `i18n` object - exports `translate` for compatibility with `@kbn/i18n`
   - `initializeI18n()` function - placeholder (no initialization needed for no-op)

**Implementation Strategy:**
   - Webpack aliases (Phase 1.6) will redirect `@kbn/i18n` and `@kbn/i18n-react` to this file
   - Keeps Navigation component code unchanged
   - Maintains type compatibility
   - Results in smallest bundle size

### Phase 1.5: Create OneNavigation Component Wrapper **COMPLETED

**Completed Changes:**

****Created `react/index.tsx` with full implementation**
   - Imported Navigation component from source
   - Re-exported all necessary types: `NavigationProps`, `BadgeType`, `MenuItem`, `NavigationStructure`, `SecondaryMenuItem`, `SecondaryMenuSection`, `SideNavLogo`
   - Created `OneNavigationProps` type (identical to `NavigationProps`)
   - Implemented `OneNavigation` component as a minimal wrapper around `Navigation`
   - Added comprehensive JSDoc documentation with usage example

**Design Decisions:**
- Minimal wrapper - no additional logic needed
- i18n handling will be done via webpack aliases (Phase 1.6)
- Layout constants are props (no context/provider needed)
- No initialization required
- Clean, simple API for external consumers

### Phase 1.6: Create Webpack Configuration **COMPLETED

**Completed Changes:**

****Created `webpack.config.js` with full configuration**
   - Entry point: `react/index.tsx`
   - Output: CommonJS bundle to `../target/index.js`
   - Mode: Production (or from `NODE_ENV`)
   - Source maps enabled for debugging

****Configured externals (peer dependencies)**
   - `@elastic/eui` - Elastic UI components
   - `@emotion/css` - CSS-in-JS styling
   - `@emotion/react` - Emotion React
   - `react` - React framework
   - `react-dom` - React DOM

****Set up module loaders**
   - Babel loader for `.js`, `.ts`, `.tsx` files
   - Uses `@kbn/babel-preset/webpack_preset`
   - No CSS loader needed (component uses Emotion exclusively for styling)

****Configured webpack aliases for i18n**
   - `@kbn/i18n` → `react/services/i18n.tsx` (no-op implementation)
   - `@kbn/i18n/react` → `react/services/i18n.tsx`
   - `@kbn/i18n-react` → `react/services/i18n.tsx`
   - Redirects all i18n imports transparently to no-op service

****Optimization settings**
   - Minification enabled for production builds
   - No minification in development mode (for readability and debugging)
   - No emit on errors (fails fast on build errors)

****Plugins**
   - CleanWebpackPlugin - Cleans output directory before each build

****Bundle size verification**
   - Development (unminified): 92 KB (94,186 bytes)
   - Production (minified): 26 KB (26,232 bytes)
   - **72% size reduction** in production mode
   - Source maps included for debugging

**Key Design Decisions:**
- Uses webpack aliases for i18n (cleanest approach, no runtime overhead)
- Externalizes large peer dependencies to reduce bundle size
- No SCSS loaders needed (Navigation uses CSS-in-JS via Emotion)
- No code splitting for simplicity (single bundle)
- Dynamic minification based on NODE_ENV (development vs production)

### Phase 1.7: Create Build Scripts **COMPLETED

**Completed Changes:**

****Created `packaging/scripts/build.sh` - Main build orchestration script**
   - Error handling with `set -e` (exit on any error)
   - **NVM integration** - Loads nvm and switches to correct Node.js version from `.nvmrc`
   - Configurable output directory (defaults to `../target`)
   - Converts relative paths to absolute paths for robustness
   - Three build steps:
     1. **Webpack build** - Bundles JavaScript with production optimizations (minified)
     2. **TypeScript definitions** - Generates `index.d.ts` from standalone `react/types.ts`
     3. **Package manifest** - Copies `package.json` to output directory
   - Verbose output showing build progress and final file listing
   - Uses environment variables: `NODE_ENV=production`, `BUILD_OUTPUT_DIR`
   - Navigates to Kibana root for webpack (to access yarn and webpack config)
   - **TypeScript command** - Simple, following one-console pattern:
     - `npx tsc react/types.ts --declaration --emitDeclarationOnly --outFile "$OUTPUT_DIR/index.d.ts" --skipLibCheck`
     - Generates types from standalone `types.ts` file (no complex flags needed)

****Created `scripts/build_one_navigation.sh` - Kibana root convenience script**
   - Provides easy access to build from Kibana root: `./scripts/build_one_navigation.sh`
   - **NVM integration** - Loads nvm and switches to correct Node.js version
   - Validates build script exists before running
   - Forwards all arguments to main build script (`"$@"`)
   - Clean output with success indicator
   - Follows same pattern as existing `build_one_console.sh`

****Made both scripts executable**
   - `chmod +x` applied to both scripts
   - Verified with `ls -lh`: both show `-rwxr-xr-x` permissions

**Build Script Features:**
- **Flexible output**: Can specify custom output directory as first argument
- **Standalone**: Can be run from within packaging directory or via convenience script
- **Production-ready**: Sets `NODE_ENV=production` for optimized builds
- **Type-safe**: Generates TypeScript declarations for external consumers
- **Complete package**: Outputs everything needed for npm publishing (`index.js`, `index.d.ts`, `package.json`, source maps)

**Build Output:**
- `index.js` - Minified production bundle (25.6 KiB)
- `index.js.map` - Source map for debugging (143 KiB)
- `index.d.ts` - TypeScript type definitions (25 KiB)
- `package.json` - Package manifest

**Usage Examples:**
```bash
# From Kibana root (recommended)
./scripts/build_one_navigation.sh

# From packaging scripts directory
cd src/core/packages/chrome/navigation/packaging/scripts
./build.sh

# Custom output directory
./build.sh /path/to/output
```

**Verified:**
- **Build completes successfully with correct Node.js version (22.17.1)
- **All output files generated correctly
- **TypeScript definitions include proper types for Navigation, MenuItem, etc.
- **Convenience script works from Kibana root
- **Webpack bundle is minified (25.6 KiB vs 92 KiB unminified)

### Phase 1.8: Create Package Manifest **COMPLETED

**Completed Changes:**

****Created `packaging/package.json` - Complete package manifest**
   - Package name: `@kbn/one-navigation`
   - Version: `1.0.0` (initial release)
   - Description: "Standalone Elastic Navigation component for external React applications"
   - License: "Elastic License 2.0 OR AGPL-3.0-only OR SSPL-1.0"
   - Entry points:
     - `main`: `../target/index.js` (CommonJS bundle)
     - `types`: `../target/index.d.ts` (TypeScript definitions)
   - Peer dependencies (externalized in webpack):
     - `@elastic/eui`: `102.2.0` (exact version for compatibility)
     - `@emotion/css`: `^11.11.0` (caret for flexibility)
     - `@emotion/react`: `^11.0.0` (caret for flexibility)
     - `react`: `^18.0.0` (caret for flexibility)
     - `react-dom`: `^18.0.0` (caret for flexibility)
   - Keywords for npm discoverability: elastic, navigation, sidebar, menu, react

**Version Strategy:**
- `@elastic/eui`: Exact version ensures compatibility with Navigation component's EUI usage patterns
- Emotion and React: Caret allows minor/patch updates for consumer flexibility
- Semantic versioning: Major.Minor.Patch (currently 1.0.0)

**Verified:**
- **Successfully copied to target directory by build script
- **All paths relative to target directory are correct
- **Peer dependencies match webpack externals configuration

### Phase 1.9: TypeScript Configuration **COMPLETED

**Completed Changes:**

****Created `packaging/react/types.ts` - Standalone type definitions**
   - Follows one-console pattern: defines types inline without importing source files
   - Avoids compiling dependencies by not importing from `.tsx` files
   - Defines all public API types:
     - `BadgeType` - 'beta' | 'techPreview'
     - `SecondaryMenuItem` - Menu item in secondary/nested menus
     - `SecondaryMenuSection` - Section grouping secondary menu items
     - `MenuItem` - Primary navigation menu item
     - `NavigationStructure` - Overall navigation structure (primary + footer items)
     - `SideNavLogo` - Logo configuration
     - `NavigationProps` - All props for Navigation component including:
       - `activeItemId` - Current active item
       - `isCollapsed` - Collapsed state
       - `items` - Navigation structure
       - `logo` - Logo configuration
       - `onItemClick` - Click callback
       - `setWidth` - Width setter for grid layout
       - `mainContentSelectors` - Focus management selectors (new in Phase 1.1)
       - `mainScrollContainerId` - Scroll container ID (new in Phase 1.1)
       - `sidePanelFooter` - Footer content
       - `data-test-subj` - Test selector
     - `OneNavigationProps` - Alias for NavigationProps
   - Only imports `ReactNode` from 'react' (minimal external dependency)
   - All other types defined inline to keep compilation simple

****Created `packaging/tsconfig.json` - For webpack/babel compilation**
   - Extends Kibana's base tsconfig
   - Includes packaging and source files
   - References `@kbn/i18n` and `@kbn/i18n-react` (aliased to no-op)
   - Excludes tests, stories, and target directory

****Created `packaging/tsconfig.type_check.json` - For type generation**
   - Extends Kibana's base type check tsconfig
   - Configured for declaration-only emission
   - **Note**: Not used by build script (follows one-console pattern)
   - Build script uses simple inline tsc command instead

**Key Design Decision:**
Following the **one-console pattern**, type definitions are generated from a standalone `types.ts` file using a simple `tsc` command, rather than using complex tsconfig files or inline flags. This approach:
- Avoids compiling dependencies
- Keeps build simple and fast
- Generates clean, minimal `.d.ts` output (3.2 KB)
- Matches established Kibana external package pattern

**Verified:**
- **Build completes successfully with simple tsc command
- **Generated `index.d.ts` is clean and minimal (3.2 KB)
- **All public API types are properly exported
- **No dependency types are compiled (only react/ReactNode imported)

### Phase 1.10: Documentation **COMPLETED

**Completed Changes:**

- A professional, clearly targeted README.md explaining features, usage, and internal-only scope (not for Kibana or external third parties).
- Expanded doc sections now cover an overview, features, target audience, install/use guides, code examples, props API, type definitions, advanced usage (like custom layout), i18n (with Phase 1 no-op details), troubleshooting, bundle size, roadmap, contributing, license, and support.
- All installation and usage requirements are specified, including the needed EUI version. Documentation provides full TypeScript examples, prop/type tables, and guidance for customization.
- BUILD.md was added as a dedicated build guide, moving build steps out of README.md and making both docs more scannable and less redundant. Troubleshooting steps and development workflow details were also improved.
- The documentation is structured for Elastic’s internal teams, with clear distinctions from Kibana and external use, and provides links to related docs and Slack for support.
- Roadmap and future plans are now clearly outlined, with timelines and focus on Elastic product consistency.

### Phase 1.11: Test External Build **COMPLETED

****Created comprehensive example application in `packaging/example/`**
   - Self-contained test application that uses the built OneNavigation package
   - Demonstrates all key features and use cases
   - Includes comprehensive verification checklist

****Example app structure:**
   - `package.json` - Minimal (scripts only, no dependencies - uses Kibana's via webpack)
   - `start.sh` - Shell script to run webpack from Kibana's node_modules
   - `webpack.config.js` - Webpack dev server with:
     - Uses `@kbn/repo-info` to dynamically find Kibana root
     - Alias to `../target` for `@kbn/one-navigation`
     - Module resolution to Kibana root (`resolve.modules` and `resolveLoader.modules`)
   - `tsconfig.json` - TypeScript configuration
   - `public/index.html` - HTML template
   - `src/App.tsx` - Comprehensive test application with:
     - Multiple navigation items (primary, nested, footer)
     - Toggle collapsed/expanded state
     - Active item tracking
     - Width management
     - Click handling
     - Custom layout constants demonstration
   - `src/index.tsx` - React 18 entry point
   - `README.md` - Setup instructions and verification checklist

****Features demonstrated:**
   - **Basic navigation rendering
   - **Primary navigation items (Dashboard, Analytics, Data)
   - **Nested/secondary menu items (multiple levels)
   - **Footer items (Settings)
   - **Logo with click handling
   - **Collapsed/expanded states with toggle
   - **Active item highlighting
   - **Width callback for layout management
   - **Custom layout constants (`mainContentSelectors`, `mainScrollContainerId`)
   - **Click event handling with state updates
   - **No-op i18n (default English messages)
   - **Emotion styling (CSS-in-JS)
   - **TypeScript type checking
   - **No Kibana dependencies required

**Testing approach:**
- Example app uses webpack alias to point to `../target` (the built package)
- All dependencies resolved from Kibana root (no separate `yarn install` needed)
- Automatically stays in sync with Kibana's dependency versions
- Run `yarn start` from example directory to launch dev server at http://localhost:3000
- Comprehensive verification checklist provided in example README

**Key validations:**
- Package can be consumed as a standalone module
- All peer dependencies work correctly (React, EUI, Emotion)
- TypeScript types are available and correct
- No runtime errors or warnings
- Bundle size is reasonable (~26 KB minified)
- No Kibana-specific dependencies leak into runtime

---

## Phase 2: Shared Build Infrastructure [NOT STARTED]

(To be implemented after Phase 1 is complete)

---

## Phase 3: Translation Support Enhancement [NOT STARTED]

(To be implemented based on demand after Phase 1)

