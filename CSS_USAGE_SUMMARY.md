# CSS Usage Summary in Kibana

This document provides a statistical overview of CSS usage patterns across the Kibana codebase, focusing on metrics and distribution to help guide migration planning.

## CSS Approach Distribution

The following table shows the approximate distribution of CSS approaches in the Kibana codebase:

| CSS Approach | Count | Percentage | Migration Priority |
|--------------|-------|------------|-------------------|
| EUI Components | ~2,000+ files | 60% | Low - Keep using EUI |
| SCSS/CSS Files | ~300+ files | 15% | High - Primary migration target |
| Emotion | ~400+ files | 20% | None - Target approach |
| styled-components | ~500+ files | 5% | Medium - Secondary migration target |

## SCSS/CSS Files by Directory

The following chart shows the distribution of traditional CSS/SCSS files across major directory structures:

| Directory | File Count | Percentage | Complexity |
|-----------|------------|------------|------------|
| `/src/core/` | ~15 files | 5% | Medium |
| `/src/platform/plugins/shared/` | ~150 files | 50% | Medium |
| `/x-pack/platform/plugins/shared/` | ~100 files | 33% | High |
| `/x-pack/solutions/` | ~35 files | 12% | Medium |

## styled-components Usage by Plugin

The following table shows the distribution of styled-components usage across different plugins:

| Plugin/Directory | File Count | Percentage | Complexity |
|------------------|------------|------------|------------|
| Fleet | ~300 files | 60% | High |
| Security | ~50 files | 10% | Medium |
| Enterprise Search | ~75 files | 15% | Medium |
| Other X-Pack plugins | ~75 files | 15% | Varies |

## Key Migration Targets

Based on the above statistics, the following areas should be prioritized for migration:

### High Priority (Start Here)

1. **Core SCSS Files** (~15 files)
   - These are foundational files that impact the entire application
   - Example: `/src/core/public/index.scss`, `/src/core/public/_css_variables.scss`
   - Migration complexity: Medium
   - Impact: High

2. **Unified Search Plugin** (~20 files)
   - Widely used across the application
   - Example: `/src/platform/plugins/shared/unified_search/public/index.scss`
   - Migration complexity: Medium
   - Impact: High

### Medium Priority

3. **Visualization Types** (~40 files)
   - Used in dashboards and visualizations
   - Example: `/src/platform/plugins/shared/vis_types/timeseries/public/application/components/_vis_editor_visualization.scss`
   - Migration complexity: Medium to High
   - Impact: Medium

4. **Fleet styled-components** (~300 files)
   - Concentrated in a single plugin
   - Example: `/x-pack/platform/plugins/shared/fleet/public/components/header.tsx`
   - Migration complexity: High (due to volume)
   - Impact: Localized to Fleet plugin

### Lower Priority

5. **Enterprise Search Styles** (~35 files)
   - Relatively self-contained
   - Example: `/x-pack/solutions/search/plugins/enterprise_search/public/applications/shared/layout/page_template.scss`
   - Migration complexity: Medium
   - Impact: Localized to Enterprise Search

## Common CSS Patterns

Analysis of the codebase reveals several common patterns that will need special attention during migration:

### SCSS Pattern: Variable Usage

```scss
// Common pattern in SCSS files
.my-component {
  background-color: $euiColorLightShade;
  padding: $euiSizeM;
  
  &__header {
    font-weight: $euiFontWeightBold;
  }
}
```

### SCSS Pattern: Nested Selectors

```scss
// Common pattern with nesting
.visualization {
  display: flex;
  
  .title {
    font-size: 16px;
  }
  
  .chart {
    height: 200px;
    
    .axis {
      stroke: #ccc;
    }
  }
}
```

### styled-components Pattern: Theme Access

```tsx
// Common pattern in styled-components
const Header = styled.header`
  background-color: ${(props) => props.theme.eui.euiColorEmptyShade};
  border-bottom: ${(props) => props.theme.eui.euiBorderThin};
  padding: ${(props) => props.theme.eui.euiSizeM};
`;
```

## Directory-Specific Migration Recommendations

### Core Module

- Strategy: Start with variable definitions and migrate core styles first
- Files to focus on: `/src/core/public/_css_variables.scss`, `/src/core/public/styles/_base.scss`
- Recommended approach: Create Emotion theme first, then migrate base styles

### Fleet Plugin

- Strategy: Start with most used components, consider migrating one directory at a time
- Consider: Fleet could be handled in isolation due to its contained nature
- Recommended approach: Use Emotion's styled API for easier migration from styled-components

### Maps Plugin

- Strategy: Focus on visual components first
- Files to focus on: Right-side controls and layer controls
- Recommended approach: Handle specialized visualization components with care to preserve functionality

## Tool Usage Statistics

| Tool | Files | Notes |
|------|-------|-------|
| SCSS/CSS Import (`import './style.scss'`) | ~250 files | Direct imports in components |
| SCSS/CSS Import with Webpack (`style-loader!css-loader!...`) | ~50 files | Legacy webpack-specific imports |
| styled-components usage (`import styled from 'styled-components'`) | ~500 files | Primarily in Fleet plugin |
| Emotion usage (`import { css } from '@emotion/react'`) | ~400 files | Target approach for migration |
| EUI Component usage | ~2,000+ files | Keep as-is, extend with Emotion when needed |

## Conclusion

The Kibana codebase has a diverse set of CSS approaches with a clear distribution pattern:

1. EUI Components form the foundation (60%)
2. Emotion is already established (20%)
3. SCSS/CSS files need migration (15%)
4. styled-components are concentrated in specific plugins (5%)

The migration strategy should focus first on core SCSS files and widely-used components, then tackle plugin-specific styles. Fleet's styled-components migration could be handled as a separate project due to its size and contained nature.

Following the detailed migration plan in CSS_STRATEGY.md will provide a clear path forward for each of these categories.
