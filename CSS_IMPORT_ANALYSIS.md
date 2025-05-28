# CSS Import Analysis for Kibana

This document provides insights from analyzing CSS/SCSS import patterns across the Kibana codebase, helping to guide the migration to Emotion.

## Key Insights from Import Analysis

### Import Statistics

- **SCSS/CSS Files**: 367 total files
- **Files importing SCSS/CSS**: 189 files
- **styled-components files**: 354 files

### Import Count vs. File Count Discrepancy

The significant difference between the number of CSS/SCSS files (367) and the files importing them (189) suggests:

- **Potential unused CSS files**: Some CSS files may no longer be actively used
- **Index file imports**: Multiple CSS files may be imported through a single index file
- **Webpack loaders**: Some CSS might be loaded through webpack configurations rather than direct imports
- **Dynamic imports**: Some styles might be loaded dynamically at runtime

### Common Import Patterns

Several patterns of CSS imports are used throughout the codebase:

1. **Direct global imports**
   ```typescript
   import './styles.scss';
   ```
   These imports apply styles globally and don't return any value. They're typically used for component-specific styles that don't need to be referenced in the component code.

2. **CSS Module imports**
   ```typescript
   import styles from './component.module.scss';
   ```
   CSS Modules scope styles to a specific component and return a mapping of class names. This pattern is more compatible with the Emotion approach.

3. **Global style imports through index files**
   ```typescript
   import '../../styles/index.scss';
   ```
   These imports often pull in multiple styles at once and can hide the actual sources of styles.

4. **Legacy webpack loader syntax** (less common)
   ```typescript
   import '!style-loader!css-loader!./styles.css';
   ```
   This explicit loader syntax is older and harder to migrate.

### Distribution by Plugin/Component

The CSS import patterns vary significantly across different parts of the codebase:

- **Maps plugin**: Contains multiple components directly importing CSS files
- **Canvas plugin**: Heavy CSS usage with both direct imports and CSS modules
- **Security plugin**: Focused CSS usage for login forms and authentication screens
- **Core components**: Relatively few direct imports, suggesting a more centralized approach
- **Fleet plugin**: Primarily uses styled-components rather than SCSS imports

### Migration Opportunities

Based on the import patterns, several opportunities for efficient migration emerge:

1. **Target components with 1:1 CSS relationships first**
   - Components that import a single SCSS file can be migrated as complete units
   - Example: `/x-pack/platform/plugins/shared/screenshotting/public/app/app.tsx`

2. **CSS Module users are ready for Emotion**
   - Components already using CSS modules (`.module.scss`) have a mental model compatible with Emotion
   - They're already thinking in terms of component-scoped styles
   - Example: `/x-pack/platform/plugins/private/canvas/shareable_runtime/components/page.module.scss`

3. **Index file imports need decomposition**
   - When a file imports an index.scss, track down all the individual stylesheets included
   - Determine which styles actually apply to the importing component
   - These are more complex migration targets

4. **Low-hanging fruit: Components with minimal styling**
   - Some components import SCSS files with only a few rules
   - These can be quickly converted to Emotion's css prop or styled API
   - Search for small SCSS files (< 50 lines) for quick wins

## Next Steps for Migration

To effectively use this analysis in your migration to Emotion:

1. **Cross-reference files**
   - Match each import with its corresponding SCSS/CSS file
   - Identify CSS files with no imports (potentially unused)
   - Flag components importing multiple CSS files (consolidation opportunities)

2. **Prioritize by complexity**
   - Start with CSS Module imports (most compatible with Emotion)
   - Next tackle direct imports with 1:1 component relationships
   - Leave index imports and webpack loader syntax for later phases

3. **Create a tracking system**
   - Use the generated import list to track migration progress
   - Tag each import with its status (pending, in progress, completed)
   - Document any special handling required

4. **Component-by-component approach**
   - For each component importing CSS:
     - Identify all CSS classes used in the component
     - Convert SCSS to Emotion equivalent
     - Test visual consistency before and after

The `scss_css_import_files_list.txt` file containing all 189 import files will be an essential reference during the migration process.

## Common Import Patterns by Example

### Direct Global Import
```typescript
// From /x-pack/platform/plugins/shared/maps/public/connected_components/map_container/map_container.tsx
import './map_container.scss';

// Component code
export const MapContainer = ({ ... }) => {
  return (
    <div className="mapContainer">
      {/* Component content */}
    </div>
  );
};
```

### CSS Module Import
```typescript
// From a Canvas component
import styles from './component.module.scss';

// Component code
export const Component = ({ ... }) => {
  return (
    <div className={styles.container}>
      {/* Component content */}
    </div>
  );
};
```

### Index File Import
```typescript
// From a plugin's main component
import '../../style/index.scss';

// This index.scss might import multiple other files:
// @import './variables.scss';
// @import './components.scss';
// @import './layout.scss';
```

This analysis provides a foundation for the CSS migration strategy outlined in `CSS_STRATEGY.md`, helping to ensure a systematic and efficient transition to Emotion.
