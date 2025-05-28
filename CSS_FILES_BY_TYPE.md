# CSS Files in Kibana By Approach Type

This document provides a comprehensive listing of files using different CSS approaches in the Kibana codebase.

## Traditional CSS/SCSS Files

These files use the traditional CSS/SCSS approach with separate stylesheet files.

| File Path |
|-----------|
| `/src/core/public/index.scss` |
| `/src/core/public/_css_variables.scss` |
| `/src/core/public/_mixins.scss` |
| `/src/core/public/styles/_base.scss` |
| `/src/core/public/styles/_index.scss` |
| `/src/core/public/styles/core_app/_globals_borealisdark.scss` |
| `/src/core/public/styles/core_app/_globals_borealislight.scss` |
| `/src/core/public/styles/core_app/_globals_v8dark.scss` |
| `/src/core/public/styles/core_app/_globals_v8light.scss` |
| `/src/core/public/styles/core_app/_mixins.scss` |
| `/src/core/packages/apps/server-internal/assets/legacy_dark_theme.css` |
| `/src/core/packages/apps/server-internal/assets/legacy_dark_theme.min.css` |
| `/src/core/packages/apps/server-internal/assets/legacy_light_theme.css` |
| `/src/core/packages/apps/server-internal/assets/legacy_light_theme.min.css` |
| `/src/core/packages/apps/server-internal/assets/legacy_styles.css` |
| `/src/core/packages/integrations/browser-internal/src/styles/disable_animations.css` |
| `/src/platform/plugins/shared/unified_search/public/index.scss` |
| `/src/platform/plugins/shared/unified_search/public/query_string_input/query_bar.scss` |
| `/src/platform/plugins/shared/unified_search/public/query_string_input/query_string_input.scss` |
| `/src/platform/plugins/shared/unified_search/public/typeahead/_suggestion.scss` |
| `/src/platform/plugins/shared/unified_search/public/filter_bar/filter_item/filter_item.scss` |
| `/src/platform/plugins/shared/unified_search/public/filter_bar/filter_item/_variables.scss` |
| `/src/platform/plugins/shared/unified_search/public/filter_bar/filter_button_group/filter_button_group.scss` |
| `/src/platform/plugins/shared/data_view_field_editor/public/components/field_format_editor/samples/samples.scss` |
| `/src/platform/plugins/shared/data_view_field_editor/public/components/flyout_panels/flyout_panels.scss` |
| `/src/platform/plugins/shared/data_view_field_editor/public/components/preview/field_preview.scss` |
| `/src/platform/plugins/shared/data_view_field_editor/public/components/preview/field_list/field_list.scss` |
| `/src/platform/plugins/shared/vis_types/timeseries/public/application/components/panel_config/_panel_config.scss` |
| `/src/platform/plugins/shared/vis_types/timeseries/public/application/components/_annotations_editor.scss` |
| `/src/platform/plugins/shared/vis_types/timeseries/public/application/components/_vis_editor_visualization.scss` |
| `/src/platform/plugins/shared/vis_types/timeseries/public/application/components/last_value_mode_popover.scss` |
| `/src/platform/plugins/shared/vis_types/timeseries/public/application/components/vis_types/markdown/_markdown.scss` |
| `/src/platform/plugins/shared/vis_types/timeseries/public/application/components/vis_types/_vis_types.scss` |
| `/src/platform/plugins/shared/vis_types/timeseries/public/application/components/_series_editor.scss` |
| `/src/platform/plugins/shared/vis_types/timeseries/public/application/components/timeseries_visualization.scss` |
| `/src/platform/plugins/shared/vis_types/timeseries/public/application/components/_error.scss` |
| `/src/platform/plugins/shared/vis_types/timeseries/public/application/components/_markdown_editor.scss` |
| `/src/platform/plugins/shared/vis_types/timeseries/public/application/components/_vis_with_splits.scss` |
| `/src/platform/plugins/shared/vis_types/timeseries/public/application/visualizations/views/_top_n.scss` |
| `/src/platform/plugins/shared/vis_types/timeseries/public/application/visualizations/views/_gauge.scss` |
| `/src/platform/plugins/shared/vis_types/timeseries/public/application/visualizations/views/_variables.scss` |
| `/src/platform/plugins/shared/vis_types/timeseries/public/application/visualizations/views/_metric.scss` |
| `/x-pack/platform/plugins/shared/maps/public/connected_components/right_side_controls/_mixins.scss` |
| `/x-pack/platform/plugins/shared/maps/public/connected_components/right_side_controls/_right_side_controls.scss` |
| `/x-pack/platform/plugins/shared/maps/public/connected_components/right_side_controls/attribution_control/_attribution_control.scss` |
| `/x-pack/platform/plugins/shared/maps/public/connected_components/right_side_controls/layer_control/_index.scss` |
| `/x-pack/platform/plugins/shared/maps/public/connected_components/right_side_controls/layer_control/_layer_control.scss` |
| `/x-pack/platform/plugins/shared/maps/public/connected_components/right_side_controls/layer_control/layer_toc/_layer_toc.scss` |
| `/x-pack/platform/plugins/shared/maps/public/connected_components/right_side_controls/layer_control/layer_toc/toc_entry/_toc_entry.scss` |
| `/x-pack/platform/plugins/shared/maps/public/connected_components/right_side_controls/mouse_coordinates_control/_mouse_coordinates_control.scss` |
| `/x-pack/platform/plugins/shared/searchprofiler/public/application/_app.scss` |
| `/x-pack/platform/plugins/shared/searchprofiler/public/application/_index.scss` |
| `/x-pack/platform/plugins/shared/searchprofiler/public/application/components/_index.scss` |
| `/x-pack/platform/plugins/shared/security/public/authentication/access_agreement/access_agreement_page.scss` |
| `/x-pack/platform/plugins/shared/security/public/authentication/components/authentication_state_page/authentication_state_page.scss` |
| `/x-pack/platform/plugins/shared/security/public/authentication/login/components/login_form/login_form.scss` |
| `/x-pack/platform/plugins/shared/security/public/authentication/login/login_page.scss` |
| `/x-pack/platform/plugins/shared/spaces/public/space_selector/space_selector.scss` |
| `/x-pack/solutions/search/plugins/enterprise_search/public/applications/applications/components/search_application/search_application_layout.scss` |
| `/x-pack/solutions/search/plugins/enterprise_search/public/applications/enterprise_search_content/components/search_index/documents.scss` |
| `/x-pack/solutions/search/plugins/enterprise_search/public/applications/enterprise_search_content/components/search_index/index_mappings.scss` |
| `/x-pack/solutions/search/plugins/enterprise_search/public/applications/enterprise_search_overview/components/product_card/product_card.scss` |
| `/x-pack/solutions/search/plugins/enterprise_search/public/applications/enterprise_search_overview/components/product_selector/product_selector.scss` |
| `/x-pack/solutions/search/plugins/enterprise_search/public/applications/shared/layout/page_template.scss` |

*Note: This is a subset of approximately 300+ CSS/SCSS files in the codebase. For a complete list, use `find /path/to/kibana -name "*.scss" -o -name "*.css" | grep -v "node_modules"`*

## Styled Components Usage

These files use the styled-components library for CSS-in-JS styling.

| File Path |
|-----------|
| `/x-pack/test/plugin_functional/plugins/resolver_test/public/applications/resolver_test/index.tsx` |
| `/x-pack/platform/packages/shared/kbn-elastic-assistant/impl/assistant/settings/assistant_settings.tsx` |
| `/x-pack/platform/packages/shared/kbn-elastic-assistant/impl/data_anonymization_editor/context_editor/get_columns/index.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/layouts/without_header.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/components/header.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/components/manage_agent_policies_modal.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/components/agent_enrollment_flyout/steps/run_k8s_apply_command_step.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/components/agent_enrollment_flyout/agent_policy_selection.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/components/generate_service_token.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/components/search_bar.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/components/fleet_server_instructions/steps/create_service_token.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/components/fleet_server_instructions/index.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/integrations/sections/epm/components/version.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agents/agent_requirements_page/fleet_server_requirement_page.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agent_policy/create_package_policy_page/multi_page_layout/components/bottom_bar.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agent_policy/create_package_policy_page/multi_page_layout/components/confirm_incoming_data_with_preview.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agent_policy/create_package_policy_page/multi_page_layout/components/add_first_integration_splash.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agent_policy/create_package_policy_page/components/steps/step_select_hosts.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agent_policy/create_package_policy_page/components/steps/step_select_agent_policy.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agent_policy/create_package_policy_page/components/steps/components/dataset_component.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agent_policy/create_package_policy_page/components/steps/components/package_policy_input_stream.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agent_policy/create_package_policy_page/components/steps/step_define_package_policy.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agent_policy/create_package_policy_page/components/steps/components/package_policy_input_var_field.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agent_policy/create_package_policy_page/components/steps/components/package_policy_input_panel.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agents/components/agent_health.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agents/components/tags.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agent_policy/components/agent_policy_form.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agents/agent_details_page/components/agent_details/index.tsx` |
| `/x-pack/platform/plugins/shared/fleet/public/applications/fleet/sections/agents/agent_list_page/components/status_bar.tsx` |

*Note: This is a subset of approximately 500+ files using styled-components in the codebase. For a complete list, use `find /path/to/kibana -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" | xargs grep -l "styled-components" | grep -v "node_modules"`*

## EUI Framework Component Usage

These files use EUI components which handle their own styling internally.

| Component | Example Usage |
|-----------|---------------|
| `EuiButton` | `<EuiButton onClick={handleClick}>Click me</EuiButton>` |
| `EuiCard` | `<EuiCard title="Title" description="Description" />` |
| `EuiFlexGroup` / `EuiFlexItem` | `<EuiFlexGroup><EuiFlexItem>Content</EuiFlexItem></EuiFlexGroup>` |
| `EuiForm` / `EuiFormRow` | `<EuiForm><EuiFormRow label="Label">Input</EuiFormRow></EuiForm>` |
| `EuiPanel` | `<EuiPanel>Content</EuiPanel>` |
| `EuiTable` / `EuiBasicTable` | `<EuiBasicTable items={items} columns={columns} />` |
| `EuiModal` / `EuiFlyout` | `<EuiModal onClose={closeModal}>Modal content</EuiModal>` |
| `EuiTabs` / `EuiTab` | `<EuiTabs><EuiTab>Tab 1</EuiTab></EuiTabs>` |

*Note: EUI components are used extensively throughout the codebase and are the preferred way of building UI components in Kibana.*

## Emotion Usage (For Reference)

While not part of this inventory's focus, Emotion is already used in parts of the codebase and will be the target for CSS unification:

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
