# OneNavigation Packaging Progress

This document tracks the implementation progress of creating the `@kbn/one-navigation` external package.

## Phase 1: Standalone Build with No-Op i18n

### Phase 1.1: Refactor Navigation Component to Accept Layout Constants ✅ COMPLETED

**Completed Changes:**

✅ **Updated `focus_main_content.ts`**
   - Removed direct import of `MAIN_CONTENT_SELECTORS`
   - Added `DEFAULT_MAIN_CONTENT_SELECTORS` constant
   - Updated function to accept `selectors` parameter with default value

✅ **Updated `navigation.tsx`**
   - Added `DEFAULT_MAIN_CONTENT_SELECTORS` and `DEFAULT_MAIN_SCROLL_CONTAINER_ID` constants
   - Added `mainContentSelectors?: string[]` prop to `NavigationProps`
   - Added `mainScrollContainerId?: string` prop to `NavigationProps`
   - Updated component to use props with default values
   - Updated all calls to `focusMainContent()` to pass `mainContentSelectors`

✅ **Updated `navigation.stories.tsx`**
   - Removed import of `APP_MAIN_SCROLL_CONTAINER_ID`
   - Updated `EuiSkipLink` to use hardcoded default value

✅ **Updated `tsconfig.json`**
   - Removed `@kbn/core-chrome-layout-constants` from `kbn_references`

**Benefits:**
- ✅ Removes dependency on `@kbn/core-chrome-layout-constants` from the component
- ✅ Makes the component more flexible and reusable
- ✅ Fully backward compatible (defaults match Kibana's constants)
- ✅ Consumers can customize selectors for their application structure
- ✅ No breaking changes for Kibana usage (defaults ensure same behavior)

### Phase 1.2: Update Component Usage for Layout Constants ✅ COMPLETED

**Completed Changes:**

✅ **Updated `focus_main_content` usage throughout Navigation component**
   - All calls to `focusMainContent()` now pass the `mainContentSelectors` prop
   - Changed from `focusMainContent()` to `focusMainContent(mainContentSelectors)`

✅ **Updated references to `APP_MAIN_SCROLL_CONTAINER_ID`**
   - Navigation component uses `mainScrollContainerId` prop throughout
   - Storybook stories updated
   - Removed import: `import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/core-chrome-layout-constants';`
   - Uses default value

✅ **Verified i18n usage patterns**
   - All `i18n.translate()` calls have `defaultMessage` option
   - All `FormattedMessage` components have `defaultMessage` prop
   - No advanced i18n features that would break no-op implementation
   - Webpack aliases will handle the redirection (configured in Phase 1.6)

✅ **Confirmed no Kibana integration changes needed**
   - Kibana continues to use Navigation component directly (not OneNavigation package)
   - Defaults preserve existing behavior, no breaking changes
   - All existing tests pass without modification

### Phase 1.3: Create Packaging Directory Structure ✅ COMPLETED

**Completed Changes:**

✅ **Created packaging directory structure**
   - `packaging/` directory created under `src/core/packages/chrome/navigation/`
   - All required subdirectories created: `react/`, `react/services/`, `scripts/`

✅ **Created placeholder files**
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

✅ **Made build script executable**
   - `chmod +x` applied to `scripts/build.sh`

### Phase 1.4: Create No-Op i18n Service ✅ COMPLETED

**Completed Changes:**

✅ **Implemented `react/services/i18n.tsx` with full no-op i18n**
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

### Phase 1.5: Create OneNavigation Component Wrapper ⏳ PENDING

### Phase 1.6: Create Webpack Configuration ⏳ PENDING

### Phase 1.7: Create Build Scripts ⏳ PENDING

### Phase 1.8: Create Package Manifest ⏳ PENDING

### Phase 1.9: TypeScript Configuration ⏳ PENDING

### Phase 1.10: Documentation ⏳ PENDING

### Phase 1.11: Test External Build ⏳ PENDING

---

## Phase 2: Shared Build Infrastructure ⏳ NOT STARTED

(To be implemented after Phase 1 is complete)

---

## Phase 3: Translation Support Enhancement ⏳ NOT STARTED

(To be implemented based on demand after Phase 1)

