# CSS Files in Kibana By Directory Structure

This document organizes CSS approaches by directory/plugin structure to provide a comprehensive overview of how different styling approaches are distributed across the Kibana codebase.

## Core

The core module primarily uses SCSS for styling.

### Core Public Styles

- `/src/core/public/index.scss` - Main entry point for core styles
- `/src/core/public/_css_variables.scss` - CSS variables definitions
- `/src/core/public/_mixins.scss` - Core SCSS mixins
- `/src/core/public/styles/_base.scss` - Base styles
- `/src/core/public/styles/_index.scss` - Index of style imports
- `/src/core/public/styles/core_app/` - Core app styles
  - `_globals_borealisdark.scss` - Borealis dark theme
  - `_globals_borealislight.scss` - Borealis light theme
  - `_globals_v8dark.scss` - V8 dark theme
  - `_globals_v8light.scss` - V8 light theme
  - `_mixins.scss` - App-specific mixins

### Core Packages

- `/src/core/packages/apps/server-internal/assets/` - Server-rendered styles
  - `legacy_dark_theme.css` - Legacy dark theme
  - `legacy_light_theme.css` - Legacy light theme
  - `legacy_styles.css` - Legacy common styles
- `/src/core/packages/integrations/browser-internal/src/styles/` - Browser integration styles
  - `disable_animations.css` - Utility for disabling animations

## Platform Plugins

### Unified Search

- `/src/platform/plugins/shared/unified_search/public/` - Unified search styles
  - `index.scss` - Main entry point
  - `query_string_input/` - Query input styles
    - `query_bar.scss`
    - `query_string_input.scss`
  - `typeahead/` - Typeahead component styles
    - `_suggestion.scss`
  - `filter_bar/` - Filter bar component styles
    - `filter_item/filter_item.scss`
    - `filter_item/_variables.scss`
    - `filter_button_group/filter_button_group.scss`

### Data View Field Editor

- `/src/platform/plugins/shared/data_view_field_editor/public/components/` - Data view field editor styles
  - `field_format_editor/samples/samples.scss`
  - `flyout_panels/flyout_panels.scss`
  - `preview/field_preview.scss`
  - `preview/field_list/field_list.scss`

### Time Series Visualizations

- `/src/platform/plugins/shared/vis_types/timeseries/public/application/` - Time series visualization styles
  - `components/` - Component styles
    - `panel_config/_panel_config.scss`
    - `_annotations_editor.scss`
    - `_vis_editor_visualization.scss`
    - `last_value_mode_popover.scss`
    - `vis_types/markdown/_markdown.scss`
    - `vis_types/_vis_types.scss`
    - `_series_editor.scss`
    - `timeseries_visualization.scss`
    - `_error.scss`
    - `_markdown_editor.scss`
    - `_vis_with_splits.scss`
  - `visualizations/views/` - Visualization view styles
    - `_top_n.scss`
    - `_gauge.scss`
    - `_variables.scss`
    - `_metric.scss`

## X-Pack

X-Pack contains a mix of styling approaches with a significant number of styled-components usage, especially in Fleet.

### Maps

- `/x-pack/platform/plugins/shared/maps/public/connected_components/` - Maps component styles
  - `right_side_controls/` - Right side controls styles
    - `_mixins.scss`
    - `_right_side_controls.scss`
    - `attribution_control/_attribution_control.scss`
    - `layer_control/` - Layer control styles
      - `_index.scss`
      - `_layer_control.scss`
      - `layer_toc/_layer_toc.scss`
      - `layer_toc/toc_entry/_toc_entry.scss`
    - `mouse_coordinates_control/_mouse_coordinates_control.scss`

### Search Profiler

- `/x-pack/platform/plugins/shared/searchprofiler/public/` - Search profiler styles
  - `application/_app.scss`
  - `application/_index.scss`
  - `application/components/_index.scss`

### Security

- `/x-pack/platform/plugins/shared/security/public/authentication/` - Authentication styles
  - `access_agreement/access_agreement_page.scss`
  - `components/authentication_state_page/authentication_state_page.scss`
  - `login/components/login_form/login_form.scss`
  - `login/login_page.scss`

### Spaces

- `/x-pack/platform/plugins/shared/spaces/public/space_selector/space_selector.scss` - Space selector styles

### Fleet (Heavy styled-components usage)

Fleet plugin makes extensive use of styled-components for styling. Here are key areas:

- `/x-pack/platform/plugins/shared/fleet/public/layouts/` - Layout components
- `/x-pack/platform/plugins/shared/fleet/public/components/` - Shared components
- `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/components/` - Fleet app components
- `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/` - Fleet sections
  - `agents/` - Agent management
  - `agent_policy/` - Agent policy management

Examples of styled-components usage:

```tsx
// From /x-pack/platform/plugins/shared/fleet/public/layouts/without_header.tsx
import styled from 'styled-components';

export const WithoutHeaderLayout = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

// From /x-pack/platform/plugins/shared/fleet/public/components/header.tsx
export const FleetHeader = styled.header`
  background-color: ${(props) => props.theme.eui.euiColorEmptyShade};
  border-bottom: ${(props) => props.theme.eui.euiBorderThin};
  padding: ${(props) => props.theme.eui.euiSizeM};
  display: flex;
  align-items: center;
`;
```

### Enterprise Search

- `/x-pack/solutions/search/plugins/enterprise_search/public/applications/` - Enterprise search styles
  - `applications/components/search_application/search_application_layout.scss`
  - `enterprise_search_content/components/search_index/documents.scss`
  - `enterprise_search_content/components/search_index/index_mappings.scss`
  - `enterprise_search_overview/components/product_card/product_card.scss`
  - `enterprise_search_overview/components/product_selector/product_selector.scss`
  - `shared/layout/page_template.scss`

## EUI Framework Usage

EUI components are used extensively throughout the codebase. The pattern is consistent across most plugins and modules:

```tsx
import {
  EuiButton,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem
} from '@elastic/eui';

const MyComponent = () => (
  <EuiPanel>
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiButton onClick={handleClick}>
          Click me
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
```

Key areas with heavy EUI usage:
- Dashboard plugins
- Visualization plugins
- Management sections
- Dev Tools
- ML, Monitoring, and other enterprise features

## Emotion Usage (Target for Unification)

Emotion is already used in parts of the codebase and represents the target for CSS unification. Examples include:

```tsx
import { css } from '@emotion/react';

const Component = () => (
  <div
    css={css`
      color: blue;
      padding: 20px;
    `}
  >
    Content
  </div>
);
```
