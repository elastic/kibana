# Kibana CSS Files by Approach

This document provides a categorized list of files that use different CSS approaches in the Kibana codebase, excluding Emotion-only usage.

## 1. Traditional CSS/SCSS Files

These files use the traditional CSS/SCSS approach, which involves separate stylesheet files imported into components.

| File Path | Description |
|-----------|-------------|
| `/src/core/public/index.scss` | Core styles entry point |
| `/src/core/public/styles/_base.scss` | Base styling for core components |
| `/src/core/public/styles/_index.scss` | Index file that imports all core styles |
| `/src/core/public/_css_variables.scss` | CSS variables used throughout Kibana |
| `/src/core/public/_mixins.scss` | SCSS mixins for reusable style patterns |
| `/src/core/public/styles/core_app/_globals_borealisdark.scss` | Dark theme styles for Borealis theme |
| `/src/core/public/styles/core_app/_globals_v8dark.scss` | Dark theme styles for v8 theme |
| `/src/core/public/styles/core_app/_globals_v8light.scss` | Light theme styles for v8 theme |
| `/src/core/public/styles/core_app/_globals_borealislight.scss` | Light theme styles for Borealis theme |
| `/src/platform/plugins/shared/unified_search/public/index.scss` | Styles for unified search components |
| `/src/platform/plugins/shared/unified_search/public/query_string_input/query_bar.scss` | Styles for the query bar component |
| `/src/platform/plugins/shared/unified_search/public/query_string_input/query_string_input.scss` | Styles for query string input |
| `/src/platform/plugins/shared/unified_search/public/typeahead/_suggestion.scss` | Styles for typeahead suggestions |
| `/src/platform/plugins/shared/unified_search/public/filter_bar/filter_item/filter_item.scss` | Styles for filter items |
| `/src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/samples/samples.scss` | Styles for field format editor samples |
| `/src/platform/plugins/shared/vis_types/timeseries/public/application/components/panel_config/_panel_config.scss` | Styles for time series visualization panel configuration |
| `/src/platform/plugins/shared/vis_types/timeseries/public/application/components/_annotations_editor.scss` | Styles for annotations editor |
| `/src/platform/plugins/shared/vis_types/timeseries/public/application/components/_vis_editor_visualization.scss` | Styles for visualization editor |
| `/src/platform/plugins/shared/vis_types/timeseries/public/application/visualizations/views/_gauge.scss` | Styles for gauge visualizations |
| `/src/platform/plugins/shared/vis_types/timeseries/public/application/visualizations/views/_metric.scss` | Styles for metric visualizations |

## 2. Styled Components Usage

These files use the styled-components library for CSS-in-JS styling, primarily in the Fleet and related plugins.

| File Path | Description |
|-----------|-------------|
| `/x-pack/platform/plugins/shared/fleet/public/layouts/without_header.tsx` | Layout component without header for Fleet |
| `/x-pack/platform/plugins/shared/fleet/public/components/header.tsx` | Header component for Fleet |
| `/x-pack/platform/plugins/shared/fleet/public/components/manage_agent_policies_modal.tsx` | Modal for managing agent policies |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/components/search_bar.tsx` | Search bar component for Fleet |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agents/components/agent_health.tsx` | Agent health component |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agents/components/tags.tsx` | Tags component for agents |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agent_policy/components/agent_policy_form.tsx` | Form for agent policy configuration |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agents/agent_details_page/components/agent_details/index.tsx` | Agent details component |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agents/agent_list_page/components/status_bar.tsx` | Status bar for agent list |
| `/x-pack/platform/packages/shared/kbn-elastic-assistant/impl/assistant/settings/assistant_settings.tsx` | Settings component for Elastic Assistant |
| `/x-pack/test/plugin_functional/plugins/resolver_test/public/applications/resolver_test/index.tsx` | Test component for resolver |

## 3. CSS Files for Legacy or Special Purposes

These files serve specific purposes like themes for server-rendered content or test-specific styling.

| File Path | Description |
|-----------|-------------|
| `/src/core/packages/apps/server-internal/assets/legacy_dark_theme.css` | Legacy dark theme for server-rendered content |
| `/src/core/packages/apps/server-internal/assets/legacy_light_theme.css` | Legacy light theme for server-rendered content | 
| `/src/core/packages/apps/server-internal/assets/legacy_styles.css` | Legacy styles for server-rendered content |
| `/src/core/packages/integrations/browser-internal/src/styles/disable_animations.css` | Utility CSS to disable animations (likely for testing) |
| `/examples/search_examples/public/index.scss` | Styles for search examples |
| `/x-pack/examples/third_party_maps_source_example/public/index.scss` | Styles for third party maps example |

## 4. EUI Framework Component Usage

These files primarily use EUI components, which handle their own styling internally. Examples of components that leverage EUI styling:

| Component | Description |
|-----------|-------------|
| `EuiButton` | Button component with built-in styling |
| `EuiCard` | Card component with built-in styling |
| `EuiFlexGroup` / `EuiFlexItem` | Layout components for flexbox-based layouts |
| `EuiForm` / `EuiFormRow` | Form components with built-in styling |
| `EuiPanel` | Panel component with built-in styling |
| `EuiTable` / `EuiBasicTable` | Table components with built-in styling |
| `EuiModal` / `EuiFlyout` | Modal and flyout components |
| `EuiTabs` / `EuiTab` | Tab navigation components |

Note: This document excludes files that use Emotion-only for CSS styling. Files using multiple approaches may appear in multiple categories.
