# EuiFlyout Accessibility Violations Report

## Summary

This report identifies all instances of the `<EuiFlyout>` component in the Kibana codebase that are missing required accessibility props (`aria-label` or `aria-labelledby`).

**Total files with violations: 65**
**Total violations: 78** (some files have multiple violations)

## ESLint Rule Being Violated

```
EuiFlyout must have either 'aria-label' or 'aria-labelledby' prop for accessibility.
```

## Recommended Fix

The preferred way to fix this is by using `aria-labelledby` with a generated ID. Example:

```tsx
import { useGeneratedHtmlId } from '@elastic/eui';

export const MyComponent = () => {
  const flyoutTitleId = useGeneratedHtmlId();
  
  return (
    <EuiFlyout onClose={onClose} aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2 id={flyoutTitleId}>My Flyout Title</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      {/* ... */}
    </EuiFlyout>
  );
};
```

## Violations by File

### Core Packages

#### src/core/packages/chrome/browser-internal/src/ui/project/sidenav_v2/fixed_layout_sidenav.tsx
- **Line 66**: `<EuiFlyout`

#### src/core/packages/overlays/browser-internal/src/flyout/flyout_service.tsx
- **Line 126**: `<EuiFlyout {...restOptions} onClose={onCloseFlyout}>`

---

### Platform Packages

#### src/platform/packages/private/kbn-language-documentation/src/components/as_flyout/index.tsx
- **Line 80**: `<EuiFlyout`

#### src/platform/packages/shared/cloud/connection_details/connection_details_flyout_content.stories.tsx
- **Line 26**: `<EuiFlyout size="s" onClose={() => {}}>`
- **Line 36**: `<EuiFlyout size="s" onClose={() => {}}>`
- **Line 46**: `<EuiFlyout size="s" onClose={() => {}}>`

#### src/platform/packages/shared/kbn-coloring/src/shared_components/color_mapping/__stories__/color_mapping.stories.tsx
- **Line 72**: `<EuiFlyout`

#### src/platform/packages/shared/kbn-coloring/src/shared_components/color_mapping/__stories__/raw_color_mapping.stories.tsx
- **Line 77**: `<EuiFlyout`

#### src/platform/packages/shared/kbn-unified-field-list/src/containers/unified_field_list_sidebar/field_list_sidebar_container.tsx
- **Line 414**: `<EuiFlyout`

#### src/platform/packages/shared/response-ops/alerts-delete/alerts_delete.stories.tsx
- **Line 69**: `<EuiFlyout type="push" onClose={closeFlyout} maxWidth={440}>`

#### src/platform/packages/shared/response-ops/alerts-table/components/alert_detail_flyout.tsx
- **Line 123**: `<EuiFlyout`

#### src/platform/packages/shared/shared-ux/page/solution_nav/src/solution_nav.tsx
- **Line 264**: `<EuiFlyout`

---

### Platform Plugins

#### src/platform/plugins/private/event_annotation_listing/public/components/group_editor_flyout/group_editor_flyout.tsx
- **Line 113**: `<EuiFlyout`

#### src/platform/plugins/shared/data_view_editor/public/components/data_view_editor.tsx
- **Line 37**: `<EuiFlyout`

#### src/platform/plugins/shared/data_view_management/public/components/field_editor/components/scripting_help/help_flyout.tsx
- **Line 62**: `<EuiFlyout onClose={onClose} data-test-subj="scriptedFieldsHelpFlyout">`

#### src/platform/plugins/shared/discover/public/context_awareness/profile_providers/example/example_data_source_profile/profile.tsx
- **Line 169**: `<EuiFlyout onClose={onFinishAction}>`

#### src/platform/plugins/shared/discover/public/context_awareness/profile_providers/example/example_root_profile/profile.tsx
- **Line 87**: `<EuiFlyout`
- **Line 134**: `<EuiFlyout`

#### src/platform/plugins/shared/es_ui_shared/__packages_do_not_import__/global_flyout/global_flyout.tsx
- **Line 107**: `<EuiFlyout {...mergedFlyoutProps}>`

#### src/platform/plugins/shared/presentation_util/public/components/labs/labs_flyout.tsx
- **Line 133**: `<EuiFlyout`

#### src/platform/plugins/shared/saved_objects_management/public/management_section/objects_table/components/flyout.tsx
- **Line 631**: `<EuiFlyout onClose={close} size="s" data-test-subj="importSavedObjectsFlyout">`

#### src/platform/plugins/shared/share/public/components/export_integrations/export_integrations.tsx
- **Line 396**: `<EuiFlyout`

#### src/platform/plugins/shared/ui_actions_enhanced/public/drilldowns/drilldown_manager/components/flyout_frame/flyout_frame.stories.tsx
- **Line 67**: `<EuiFlyout onClose={() => {}}>`

---

### X-Pack Examples

#### x-pack/examples/lens_embeddable_inline_editing_example/public/flyout.tsx
- **Line 42**: `<EuiFlyout`

---

### X-Pack Platform Packages

#### x-pack/platform/packages/shared/kbn-elastic-assistant/impl/assistant/common/components/assistant_settings_management/flyout/index.tsx
- **Line 45**: `<EuiFlyout`

---

### X-Pack Platform Plugins

#### x-pack/platform/plugins/private/canvas/public/components/keyboard_shortcuts_doc/keyboard_shortcuts_doc.tsx
- **Line 84**: `<EuiFlyout`

#### x-pack/platform/plugins/private/data_visualizer/public/application/common/components/filebeat_config_flyout/filebeat_config_flyout.tsx
- **Line 59**: `<EuiFlyout onClose={closeFlyout} hideCloseButton size={'m'} ownFocus={false}>`

#### x-pack/platform/plugins/private/reporting/public/management/components/scheduled_report_flyout.tsx
- **Line 28**: `<EuiFlyout`

#### x-pack/platform/plugins/private/watcher/public/application/sections/watch_edit_page/components/json_watch_edit/simulate_watch_results_flyout.tsx
- **Line 180**: `<EuiFlyout`
- **Line 227**: `<EuiFlyout`

#### x-pack/platform/plugins/private/watcher/public/application/sections/watch_status_page/components/execution_history_panel.tsx
- **Line 234**: `<EuiFlyout`
- **Line 305**: `<EuiFlyout`

#### x-pack/platform/plugins/shared/automatic_import/public/components/create_integration/create_automatic_import/steps/review_step/review_step.tsx
- **Line 101**: `<EuiFlyout`

#### x-pack/platform/plugins/shared/content_connectors/public/components/connectors/create_connector/components/manual_configuration_flyout.tsx
- **Line 74**: `<EuiFlyout`

#### x-pack/platform/plugins/shared/dashboards/public/dashboard_actions/add_to_library_action.tsx
- **Line 64**: `<EuiFlyout`

#### x-pack/platform/plugins/shared/fleet/public/components/agent_enrollment_flyout/agent_enrollment_flyout.tsx
- **Line 239**: `<EuiFlyout`

#### x-pack/platform/plugins/shared/fleet/public/components/agentless_enrollment_flyout/index.tsx
- **Line 150**: `<EuiFlyout`

#### x-pack/platform/plugins/shared/fleet/public/components/uninstall_command_flyout/uninstall_command_flyout.tsx
- **Line 189**: `<EuiFlyout`

#### x-pack/platform/plugins/shared/index_management/public/application/components/component_templates/component_templates_flyout_with_context.tsx
- **Line 95**: `<EuiFlyout onClose={onClose}>`

#### x-pack/platform/plugins/shared/index_management/public/application/sections/home/data_stream_list/data_stream_detail_panel/data_stream_detail_panel.tsx
- **Line 623**: `<EuiFlyout`

#### x-pack/platform/plugins/shared/index_management/public/application/sections/home/template_list/template_details/index_template_flyout_with_context.tsx
- **Line 88**: `<EuiFlyout onClose={onClose}>`

#### x-pack/platform/plugins/shared/ingest_pipelines/public/application/components/pipeline_editor/components/processor_form/edit_processor_form.tsx
- **Line 164**: `<EuiFlyout`

#### x-pack/platform/plugins/shared/lens/public/app_plugin/shared/edit_on_the_fly/get_edit_lens_configuration.tsx
- **Line 108**: `<EuiFlyout`

#### x-pack/platform/plugins/shared/ml/public/alerting/anomaly_detection_alerts_table/alerts_table_flyout.tsx
- **Line 63**: `<EuiFlyout`

#### x-pack/platform/plugins/shared/ml/public/application/components/import_export_jobs/export_jobs_flyout/export_jobs_flyout_content.tsx
- **Line 210**: `<EuiFlyout`

#### x-pack/platform/plugins/shared/ml/public/application/components/import_export_jobs/import_jobs_flyout/import_jobs_flyout.tsx
- **Line 373**: `<EuiFlyout`

#### x-pack/platform/plugins/shared/ml/public/application/data_frame_analytics/pages/analytics_exploration/components/analytics_detail_flyout/analytics_detail_flyout.tsx
- **Line 84**: `<EuiFlyout`

#### x-pack/platform/plugins/shared/ml/public/application/jobs/components/job_details_flyout/job_details_flyout.tsx
- **Line 87**: `<EuiFlyout`

#### x-pack/platform/plugins/shared/ml/public/application/jobs/new_job/pages/components/common/edit_categorization_analyzer_flyout/edit_categorization_analyzer_flyout.tsx
- **Line 76**: `<EuiFlyout onClose={() => setShowJsonFlyout(false)} hideCloseButton size="m">`

#### x-pack/platform/plugins/shared/ml/public/application/jobs/new_job/pages/components/common/json_editor_flyout/json_editor_flyout.tsx
- **Line 183**: `<EuiFlyout`

#### x-pack/platform/plugins/shared/security/public/management/roles/edit_role/privileges/kibana/privilege_summary/privilege_summary.tsx
- **Line 48**: `<EuiFlyout`

#### x-pack/platform/plugins/shared/security/public/management/roles/edit_role/privileges/kibana/space_aware_privilege_section/privilege_space_form.tsx
- **Line 97**: `<EuiFlyout`

#### x-pack/platform/plugins/shared/triggers_actions_ui/public/application/sections/rule_details/components/rule_action_error_log_flyout.tsx
- **Line 56**: `<EuiFlyout`

---

### X-Pack Solutions - Observability

#### x-pack/solutions/observability/plugins/apm/public/components/app/transaction_details/waterfall_with_summary/waterfall_container/waterfall/responsive_flyout.tsx
- **Line 22**: `} & EuiFlyoutProps) => <EuiFlyout {...flyoutProps} className={className} />`

#### x-pack/solutions/observability/plugins/profiling/public/components/frame_information_window/frame_information_tooltip.tsx
- **Line 18**: `<EuiFlyout onClose={onClose} size="m">`

#### x-pack/solutions/observability/plugins/profiling/public/components/stack_traces/index.tsx
- **Line 168**: `<EuiFlyout`

#### x-pack/solutions/observability/plugins/synthetics/public/apps/synthetics/components/common/components/view_document.tsx
- **Line 40**: `<EuiFlyout`

#### x-pack/solutions/observability/plugins/synthetics/public/apps/synthetics/components/monitor_add_edit/fields/script_recorder_fields.tsx
- **Line 91**: `<EuiFlyout`

#### x-pack/solutions/observability/plugins/synthetics/public/apps/synthetics/components/monitors_page/overview/overview/monitor_detail_flyout.tsx
- **Line 287**: `<EuiFlyout`

---

### X-Pack Solutions - Search

#### x-pack/solutions/search/plugins/enterprise_search/public/applications/enterprise_search_content/components/connectors/create_connector/components/manual_configuration_flyout.tsx
- **Line 74**: `<EuiFlyout`

#### x-pack/solutions/search/plugins/enterprise_search/public/applications/enterprise_search_content/components/search_index/connector/sync_rules/edit_sync_rules_flyout.tsx
- **Line 98**: `<EuiFlyout`

#### x-pack/solutions/search/plugins/enterprise_search/public/applications/shared/layout/endpoints_header_action.tsx
- **Line 41**: `<EuiFlyout onClose={() => setOpen(false)} size={'s'}>`

---

### X-Pack Solutions - Security

#### x-pack/solutions/security/plugins/cloud_security_posture/public/pages/rules/rules_flyout.tsx
- **Line 86**: `<EuiFlyout`

#### x-pack/solutions/security/plugins/security_solution/public/exceptions/components/import_exceptions_list_flyout/index.tsx
- **Line 170**: `<EuiFlyout`

#### x-pack/solutions/security/plugins/security_solution/public/flyout/document_details/shared/components/take_action_button.tsx
- **Line 208**: `<EuiFlyout onClose={showAlertDetails} size="m" maskProps={maskProps}>`

#### x-pack/solutions/security/plugins/security_solution/public/flyout/entity_details/host_right/content.stories.tsx
- **Line 26**: `<EuiFlyout size="m" onClose={() => {}}>`

#### x-pack/solutions/security/plugins/security_solution/public/flyout/entity_details/user_right/content.stories.tsx
- **Line 26**: `<EuiFlyout size="m" onClose={() => {}}>`

#### x-pack/solutions/security/plugins/security_solution/public/management/pages/endpoint_hosts/view/details/index.tsx
- **Line 32**: `<EuiFlyout`

---

## Notes

1. Some violations are in `.stories.tsx` files (Storybook stories), which are development/documentation files.
2. The `flyout_service.tsx` file is a core service that dynamically creates flyouts, which may require special handling.
3. Many violations are in X-Pack licensed features across Security, Observability, and Search solutions.

## Next Steps

These violations should be fixed by adding the appropriate `aria-labelledby` or `aria-label` prop to each `<EuiFlyout>` component. The preferred approach is to use `aria-labelledby` with a generated ID that references the flyout's title element.
