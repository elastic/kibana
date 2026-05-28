/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CorrelationEntry, EndpointId, FlyoutCorrelationEntry } from './types';

export const PRIVILEGE_ENDPOINT_PATHS: Record<EndpointId, string> = {
  risk_engine: '/internal/risk_score/engine/privileges',
  // Uses V2 entity store endpoint when FF_ENABLE_ENTITY_STORE_V2 is active
  entity_store: '/internal/security/entity_store/check_privileges',
  leads: '/internal/entity_analytics/leads/privileges',
  watchlists: '/api/entity_analytics/watchlists/privileges',
  asset_criticality: '/internal/asset_criticality/privileges',
};

export const buildEndpointUrl = (kibanaUrl: string, spacePath: string, path: string): string =>
  `${kibanaUrl}${spacePath}${path}`;

export const buildSpacePath = (space: string): string => (space === 'default' ? '' : `/s/${space}`);

/**
 * One entry per UI feature gate.
 * privilegeField = the field in the API response that determines the gate.
 * page = Kibana app path (no space prefix; caller prepends /s/{space} when needed).
 * presentWhenDenied = data-test-subj selectors expected in the DOM when the privilege is denied.
 * absentWhenDenied = data-test-subj selectors expected to be absent when the privilege is denied.
 */
export const CORRELATION_MAP: CorrelationEntry[] = [
  // ── EA Home Page ────────────────────────────────────────────────────────────
  {
    featureName: 'EA Home: full page blocked',
    endpoint: 'entity_store',
    privilegeField: 'has_read_permissions',
    expectedWhenDenied: 'NoPrivileges page shown — "Privileges required" heading visible',
    page: '/app/security/entity_analytics',
    // NoPrivileges component title (no_privileges/translations.ts → NO_PERMISSIONS_TITLE)
    // Absence of this title is sufficient to confirm the full page loaded (no textWhenGranted
    // needed: the NoPrivileges body itself contains "entity analytics" as the pageName).
    textWhenDenied: ['Privileges required'],
  },
  {
    featureName: 'EA Home: risk engine callout',
    endpoint: 'risk_engine',
    // The callout is driven by useMissingRiskEnginePrivileges({ readonly: true }) which only
    // requires read access — not the full has_all_required set (read+write+cluster).
    privilegeField: 'has_read_permissions',
    expectedWhenDenied: '"Insufficient privileges" callout visible; page still loads',
    page: '/app/security/entity_analytics',
    // missing_privileges/translations.tsx → MISSING_PRIVILEGES_CALLOUT_TITLE
    textWhenDenied: ['Insufficient privileges'],
  },
  {
    featureName: 'EA Home: leads panel hidden',
    endpoint: 'leads',
    privilegeField: 'has_read_permissions',
    expectedWhenDenied: 'Leads panel absent; panel heading not visible',
    page: '/app/security/entity_analytics',
    // top_threat_hunting_leads/translations.ts → TITLE
    textWhenGranted: ['Top threat hunting leads'],
  },
  {
    featureName: 'EA Home: leads generate button disabled',
    endpoint: 'leads',
    privilegeField: 'has_write_permissions',
    expectedWhenDenied: 'Generate button is aria-disabled',
    page: '/app/security/entity_analytics',
    // top_threat_hunting_leads/translations.ts → GENERATE_BUTTON / REGENERATE_BUTTON
    buttonDisabledWhenDenied: ['Generate', 'Regenerate'],
  },

  // ── EA Management Page ──────────────────────────────────────────────────────
  {
    featureName: 'EA Management: missing privileges callout',
    endpoint: 'entity_store',
    privilegeField: 'has_all_required',
    expectedWhenDenied: '"Insufficient privileges" callout shown on management page',
    page: '/app/security/entity_analytics_management',
    textWhenDenied: ['Insufficient privileges'],
  },
  {
    featureName: 'EA Management: Engine Status tab hidden',
    endpoint: 'entity_store',
    privilegeField: 'has_all_required',
    expectedWhenDenied: '"Engine Status" tab not rendered',
    page: '/app/security/entity_analytics_management',
    // entity_analytics_management_page.tsx → "Engine Status" tab label
    textWhenGranted: ['Engine Status'],
  },
  {
    featureName: 'EA Management: Clear Entity Data button hidden',
    endpoint: 'entity_store',
    privilegeField: 'has_all_required',
    expectedWhenDenied: '"Clear Entity Data" button not rendered',
    page: '/app/security/entity_analytics_management',
    // clear_entity_data_button.tsx → "Clear Entity Data"
    textWhenGranted: ['Clear Entity Data'],
  },

  // ── EA Management → Watchlists Tab ─────────────────────────────────────────
  {
    featureName: 'EA Management → Watchlists: no read callout',
    endpoint: 'watchlists',
    privilegeField: 'has_read_permissions',
    expectedWhenDenied: '"Insufficient privileges to view or manage Watchlists" callout',
    page: '/app/security/entity_analytics_management/watchlists',
    // watchlists/index.tsx → inline defaultMessage
    textWhenDenied: ['Insufficient privileges to view or manage Watchlists'],
  },
  {
    featureName: 'EA Management → Watchlists: Create button disabled',
    endpoint: 'watchlists',
    privilegeField: 'has_write_permissions',
    expectedWhenDenied: '"Insufficient privileges to create or delete watchlists" callout',
    page: '/app/security/entity_analytics_management/watchlists',
    // watchlists/watchlists_tab.tsx → inline defaultMessage (write denied → callout shown)
    textWhenDenied: ['Insufficient privileges to create or delete watchlists'],
    // watchlists_tab.tsx → button always renders, isDisabled={!hasAllRequired}
    buttonDisabledWhenDenied: ['Create watchlist'],
  },

  // ── EA Management → Asset Criticality Tab ──────────────────────────────────
  {
    featureName: 'EA Management → Asset Criticality: no write uploader hidden',
    endpoint: 'asset_criticality',
    privilegeField: 'has_write_permissions',
    expectedWhenDenied:
      '"Privileges to access the Asset Criticality feature are missing" callout shown',
    page: '/app/security/entity_analytics_management/asset_criticality',
    // asset_criticality_tab.tsx → InsufficientAssetCriticalityPrivilegesCallout text
    textWhenDenied: ['Privileges to access the Asset Criticality feature are missing'],
    // asset_criticality_tab.tsx → upload section visible when granted
    textWhenGranted: ['Bulk assign asset criticality'],
  },

  // ── Explore → Hosts → Risk Tab ──────────────────────────────────────────────
  {
    featureName: 'Explore → Hosts → Risk tab callout',
    endpoint: 'risk_engine',
    // host_risk_score_tab_body.tsx uses useMissingRiskEnginePrivileges({ readonly: true })
    privilegeField: 'has_read_permissions',
    expectedWhenDenied: '"Insufficient privileges" callout replaces risk tab body',
    page: '/app/security/hosts/risk',
    textWhenDenied: ['Insufficient privileges'],
  },

  // ── Explore → Users → Risk Tab ──────────────────────────────────────────────
  {
    featureName: 'Explore → Users → Risk tab callout',
    endpoint: 'risk_engine',
    // user_risk_score_tab_body uses useMissingRiskEnginePrivileges({ readonly: true })
    privilegeField: 'has_read_permissions',
    expectedWhenDenied: '"Insufficient privileges" callout replaces risk tab body',
    page: '/app/security/users/risk',
    textWhenDenied: ['Insufficient privileges'],
  },
];

/**
 * Flyout panel correlation map.
 * Each entry describes one privilege-gated panel inside the entity details flyout.
 * selectorWhenGranted is the CSS selector that should be PRESENT in the DOM when
 * the persona has the required permission; its absence is treated as a denial.
 *
 * The flyout is opened by navigating to the EA Home Page and clicking the
 * "Open entity details" expand button on the ea-audit-test-user row.
 * Probing is skipped for personas that lack entity_store read access.
 */
export const FLYOUT_CORRELATION_MAP: FlyoutCorrelationEntry[] = [
  {
    panelLabel: 'Risk Score Summary',
    endpoint: 'risk_engine',
    privilegeField: 'has_all_required',
    selectorWhenGranted: '[data-test-subj="risk-summary-table"]',
  },
  {
    panelLabel: 'Asset Criticality Selector',
    endpoint: 'asset_criticality',
    privilegeField: 'has_read_permissions',
    selectorWhenGranted: '[data-test-subj="asset-criticality-selector"]',
  },
];

export const KNOWN_GAPS: string[] = [
  'WatchlistFilter on EA Home Page header: renders without a privilege pre-check. ' +
    'If the user lacks read on the watchlist index, the dropdown call fails silently (empty) ' +
    'or surfaces an unhandled error. No data-test-subj target exists for automated verification.',
  'Flyout probe only runs for personas that have entity_store read access; ' +
    'personas denied entity store access receive SKIP for all flyout panels.',
  'Watchlist membership badge inside the flyout (EntityHighlightsAccordion) has no stable ' +
    'data-test-subj that can be targeted per watchlist entry, so it is not covered in the ' +
    'automated flyout probe.',
];
