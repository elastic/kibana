/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Use these when declaring locator definitions and when using the Locator service to find a locator.
 */
export enum LocatorId {
  // Defined
  ConsoleApp = 'CONSOLE_APP_LOCATOR',
  Discover = 'DISCOVER_APP_LOCATOR',
  ILM = 'ILM_LOCATOR_ID',
  IngestPipelines = 'INGEST_PIPELINES_APP_LOCATOR',
  ML = 'ML_APP_LOCATOR',
  Management = 'MANAGEMENT_APP_LOCATOR',
  RemoteClusters = 'REMOTE_CLUSTERS_LOCATOR',
  SearchProfiler = 'SEARCH_PROFILER_LOCATOR',
  SnapshotRestore = 'SNAPSHOT_RESTORE_LOCATOR',
  VisualizeLibrary = 'VISUALIZE_APP_LOCATOR',

  // NEW, WIP
  RulesManagement = 'RULES_MANAGEMENT_LOCATOR',
  CasesManagement = 'CASES_MANAGEMENT_LOCATOR',
  ConnectorsManagement = 'CONNECTORS_MANAGEMENT_LOCATOR',
  CrossClusterReplication = 'CCR_MANAGEMENT_LOCATOR',
  DashboardLanding = 'DASHBOARD_LANDING_APP_LOCATOR',
  Fleet = 'FLEET_APP_LOCATOR',
  GrokDebugger = 'GROKDEBUGGER_APP_LOCATOR',
  IndexManagement = 'INDEX_MANAGEMENT_LOCATOR',
  Integrations = 'INTEGRATIONS_APP_LOCATOR',
  LogstashPipelines = 'LOGSTASH_MANAGEMENT_LOCATOR',
  MachineLearningManagement = 'ML_MANAGEMENT_LOCATOR',
  Osquery = 'OSQUERY_APP_LOCATOR',
  PainlessLab = 'PAINLESS_LAB_APP_LOCATOR',
  Reporting = 'REPORTING_MANAGEMENT_LOCATOR',
  Rollup = 'ROLLUP_MANAGEMENT_LOCATOR',
  Security = 'SECURITY_MANAGEMENT_LOCATOR',
  Transform = 'TRANSFORMS_MANAGEMENT_LOCATOR',
  UpgradeAssistant = 'UPGRADE_ASSISTANT_MANAGEMENT_LOCATOR',
  Watcher = 'WATCHER_MANAGEMENT_LOCATOR',
  Spaces = 'SPACES_MANAGEMENT_LOCATOR',

  // Defined, unused
  APM = 'APM_LOCATOR',
  Canvas = 'CANVAS_APP_LOCATOR',
  Dashboard = 'DASHBOARD_APP_LOCATOR', // goes to "create new dashboard"
  DataVisualizer = 'DATA_VISUALIZER_APP_LOCATOR',
  DiscoverContext = 'DISCOVER_CONTEXT_APP_LOCATOR',
  DiscoverSingleDoc = 'DISCOVER_SINGLE_DOC_LOCATOR',
  LegacyShortUrl = 'LEGACY_SHORT_URL_LOCATOR',
  Lens = 'LENS_APP_LOCATOR',
  LicenseManagement = 'LICENSE_MANAGEMENT_LOCATOR',
  Maps = 'MAPS_APP_LOCATOR',
  MapsRegionMap = 'MAPS_APP_REGION_MAP_LOCATOR',
  MapsTileMap = 'MAPS_APP_TILE_MAP_LOCATOR',
  RuleDetails = 'RULE_DETAILS_LOCATOR',
  ShortUrlRedirect = 'SHORT_URL_REDIRECT_LOCATOR',
  SyntheticsEditMonitor = 'SYNTHETICS_EDIT_MONITOR_LOCATOR',
  SyntheticsMonitorDetail = 'SYNTHETICS_MONITOR_DETAIL_LOCATOR',
  Uptime = 'UPTIME_OVERVIEW_LOCATOR',
}
