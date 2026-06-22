/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Constants for the Security-in-Discover experience tests.
 *
 * These tests exercise the Security Solution context-awareness profile that enhances Discover's
 * document viewer flyout for security documents (alert / event / IOC). The profile only activates
 * under the `security` space solution view; document type is detected purely from fields
 * (`event.kind === 'signal'` → alert, `event.kind` present & ≠ signal → event, `event.type`
 * includes `indicator` → IOC), so plain synthetic indices are sufficient.
 */

/** Synthetic ES indices created in global setup (see ./generators). */
export const SECURITY_INDICES = {
  ALERTS: 'security-discover-alerts',
  EVENTS: 'security-discover-events',
  IOCS: 'security-discover-iocs',
} as const;

/**
 * Data view titles/names imported via the kbn archive. The title doubles as the lookup key for
 * `scoutSpace.uiSettings.setDefaultIndex` and the display name matched by `discover.selectDataView`.
 */
export const SECURITY_DATA_VIEWS = {
  ALERTS: `${SECURITY_INDICES.ALERTS}*`,
  EVENTS: `${SECURITY_INDICES.EVENTS}*`,
  IOCS: `${SECURITY_INDICES.IOCS}*`,
} as const;

/** Saved search (Discover session) used by the dashboard-embedded test. */
export const SECURITY_SAVED_SEARCH_TITLE = 'Security Discover alerts saved search';

/** Wide window covering the fixed synthetic document timestamps. */
export const SECURITY_TIME_RANGE = {
  from: '2025-01-01T00:00:00.000Z',
  to: '2025-12-31T23:59:59.999Z',
} as const;

/**
 * Force a viewport at/above EUI's `xl` breakpoint (1200px). Discover's doc viewer flyout — which the
 * security profile enhances — is a push flyout with `pushMinBreakpoint="xl"`, so it only renders in
 * push mode (taking space beside Discover, as it does for users) on wide screens. Below `xl` it falls
 * back to an overlay. Apply via `spaceTest.use({ viewport: PUSH_FLYOUT_VIEWPORT })`.
 */
export const PUSH_FLYOUT_VIEWPORT = { width: 1920, height: 1080 } as const;

/** Path to the saved-objects (data views + saved search) archive, relative to the repo root. */
export const SECURITY_KBN_ARCHIVE =
  'src/platform/plugins/shared/discover/test/scout/ui/fixtures/security_experience/kbn_archives/security_saved_objects.json';

/** Representative field values asserted in the specs. */
export const SECURITY_TEST_DATA = {
  ALERT_RULE_NAME: 'Security Discover test rule',
  HOST_NAME: 'discover-test-host',
  USER_NAME: 'discover-test-user',
  SOURCE_IP: '10.0.0.1',
  IOC_NAME: 'malicious.example.com',
} as const;

/**
 * Test subjects rendered by the Security flyout content inside Discover's doc viewer. These are the
 * same subjects used by the alerts-table flyout (the Discover overview tab reuses the same
 * `OverviewTab` component), so they are shared with the security_solution flyout_v2 suite.
 */
export const SECURITY_FLYOUT_TEST_SUBJECTS = {
  // Discover doc viewer flyout container + content
  DOC_VIEWER_FLYOUT: 'docViewerFlyout',
  DOC_VIEWER: 'kbnDocViewer',
  // Doc viewer tabs (security overview is injected at order 0; Table/JSON are Discover defaults).
  // Tab buttons carry an `aria-selected` attribute reflecting the active tab.
  OVERVIEW_TAB: 'docViewerTab-doc_view_alerts_overview',
  IOC_OVERVIEW_TAB: 'docViewerTab-doc_view_ioc_overview',
  TABLE_TAB: 'docViewerTab-doc_view_table',
  JSON_TAB: 'docViewerTab-doc_view_source',
  TABLE_TAB_CONTENT: 'UnifiedDocViewerTableGrid',
  // Alert / event header
  ALERT_TITLE: 'securitySolutionFlyoutAlertTitleText',
  // Title icon — alerts render the `warning` icon, events the `analyzeEvent` icon (the loaded
  // EuiIcon exposes the type via the `data-icon-type` attribute).
  TITLE_ICON: 'securitySolutionFlyoutAlertTitleIcon',
  SEVERITY: 'severity',
  STATUS_BADGE: 'rule-status-badge',
  RISK_SCORE: 'securitySolutionFlyoutHeaderRiskScoreValue',
  // Alert / event overview tab sections
  ABOUT_SECTION: 'securitySolutionFlyoutAboutSectionHeader',
  INVESTIGATION_SECTION: 'securitySolutionFlyoutInvestigationSectionHeader',
  VISUALIZATIONS_SECTION: 'securitySolutionFlyoutVisualizationsHeader',
  INSIGHTS_SECTION: 'securitySolutionFlyoutInsightsSectionHeader',
  RESPONSE_SECTION: 'securitySolutionFlyoutResponseSectionHeader',
  RULE_SUMMARY_BUTTON: 'securitySolutionFlyoutRuleSummaryButton',
  HIGHLIGHTED_FIELDS_TABLE: 'securitySolutionFlyoutHighlightedFieldsDetails',
  // Discover cell-actions hover popover on a highlighted field value, and its action buttons. In
  // Discover the flyout uses `DiscoverCellActions` (not the alerts-table cell-action providers).
  CELL_ACTIONS_POPOVER: 'securitySolutionOneDiscoverCellActions',
  CELL_ACTION_FILTER_IN: 'securitySolutionOneDiscoverCellAction-filterIn',
  CELL_ACTION_FILTER_OUT: 'securitySolutionOneDiscoverCellAction-filterOut',
  CELL_ACTION_FILTER_EXISTS: 'securitySolutionOneDiscoverCellAction-filterExists',
  CELL_ACTION_TOGGLE_COLUMN: 'securitySolutionOneDiscoverCellAction-toggleColumn',
  CELL_ACTION_COPY: 'securitySolutionOneDiscoverCellAction-copyToClipboard',
  // Footer
  TAKE_ACTION_BUTTON: 'securitySolutionFlyoutFooterDropdownButton',
  // IOC overview tab content (threat-intelligence overview reused in Discover)
  IOC_OVERVIEW_TITLE: 'tiFlyoutOverviewTitle',
  IOC_OVERVIEW_HIGH_LEVEL_BLOCKS: 'tiFlyoutOverviewHighLevelBlocks',
} as const;

/**
 * Take-action menu test subjects. The alert/event document flyout shares one footer menu; the IOC
 * flyout has its own. Item visibility is document-type dependent (see take_action_button.tsx):
 * alert-only items (status, tags, assignees, host isolation, run-alert-workflow) are hidden for
 * events; `investigate-in-timeline` only renders inside the security app, so it is hidden in Discover
 * (explore actions render instead).
 */
export const TAKE_ACTION_TEST_SUBJECTS = {
  // Alert / event document footer menu
  BUTTON: 'securitySolutionFlyoutFooterDropdownButton',
  MENU: 'takeActionPanelMenu',
  ADD_TO_NEW_CASE: 'add-to-new-case-action',
  ADD_TO_EXISTING_CASE: 'add-to-existing-case-action',
  STATUS_CLOSE: 'alert-close-context-menu-item',
  ALERT_TAGS: 'alert-tags-context-menu-item',
  ALERT_ASSIGNEES: 'alert-assignees-context-menu-item',
  RUN_WORKFLOW: 'run-workflow-action',
  ADD_NOTE: 'add-note-action',
  INVESTIGATE_IN_TIMELINE: 'investigate-in-timeline-action-item',
  // Sub-panels / modals opened from the document menu
  CLOSING_REASON_PANEL: 'alert-closing-reason-selectable',
  ALERT_TAGS_PANEL: 'alert-tags-selectable-menu',
  ALERT_ASSIGNEES_PANEL: 'alert-assignees-selectable-menu',
  ALL_CASES_MODAL: 'all-cases-modal',
  // IOC footer menu
  IOC_BUTTON: 'tiIndicatorFlyoutTakeActionButton',
  IOC_INVESTIGATE_IN_TIMELINE: 'tiIndicatorFlyoutInvestigateInTimelineContextMenu',
  IOC_ADD_TO_EXISTING_CASE: 'tiIndicatorFlyoutAddToExistingCaseContextMenu',
  IOC_ADD_TO_NEW_CASE: 'tiIndicatorFlyoutAddToNewCaseContextMenu',
  IOC_ADD_TO_BLOCK_LIST: 'tiIndicatorFlyoutAddToBlockListContextMenu',
} as const;
