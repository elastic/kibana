/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFips } from 'crypto';
import { difference } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import type { Root } from '@kbn/core-root-server-internal';
import { createRootWithCorePlugins } from '@kbn/core-test-helpers-kbn-server';
import { PLUGIN_SYSTEM_ENABLE_ALL_PLUGINS_CONFIG_PATH } from '@kbn/core-plugins-server-internal/src/constants';
import { getExposedConfigKeys } from '@kbn/core-plugins-server-internal/src/create_browser_config';
import { filterUiPlugins } from '@kbn/core-rendering-server-internal/src/filter_ui_plugins';

const EXPOSED_CONFIG_SETTINGS_ERROR = `Actual config settings exposed to the browser do not match the list defined in this test.
This assertion fails if extra settings are present and/or expected settings are missing.
Ensure that your change does not unintentionally expose any sensitive values!`;

/**
 * Config keys exposed to the browser on authenticated pages.
 *
 * NOTE: each exposed config key has its schema type at the end in "(parentheses)". The schema type comes from Joi; in particular,
 * "(any)" can mean a few other data types. This is only intended to be a hint to make it easier for future reviewers to understand
 * what types of config settings can be exposed to the browser.
 * When plugin owners make a change that exposes additional config values, the changes will be reflected in this test assertion.
 * Ensure that your change does not unintentionally expose any sensitive values!
 */
const EXPECTED_EXPOSED_CONFIG_KEYS = [
  'console.autocompleteDefinitions.endpointsAvailability (stack?|serverless?)',
  'console.ui.enabled (boolean?)',
  'console.ui.embeddedEnabled (boolean?)',
  'unifiedSearch.autocomplete.querySuggestions.enabled (boolean?)',
  'unifiedSearch.autocomplete.valueSuggestions.enabled (boolean?)',
  'unifiedSearch.autocomplete.valueSuggestions.terminateAfter (duration?)',
  'unifiedSearch.autocomplete.valueSuggestions.tiers (array?)',
  'unifiedSearch.autocomplete.valueSuggestions.timeout (duration?)',
  'data.search.aggs.shardDelay.enabled (boolean?)',
  'data.search.asyncSearch.batchedReduceSize (number?)',
  'data.search.asyncSearch.keepAlive (duration?)',
  'data.search.asyncSearch.waitForCompletion (duration?)',
  'data.search.asyncSearch.pollInterval (number?)',
  'data.search.sessions.defaultExpiration (duration?)',
  'data.search.sessions.enabled (boolean?)',
  'data.search.sessions.management.expiresSoonWarning (duration?)',
  'data.search.sessions.management.maxSessions (number?)',
  'data.search.sessions.management.refreshInterval (duration?)',
  'data.search.sessions.management.refreshTimeout (duration?)',
  'data.search.sessions.maxUpdateRetries (number?)',
  'data.search.sessions.notTouchedTimeout (duration?)',
  'data.query.timefilter.minRefreshInterval (number?)',
  'data.search.asyncSearch.pollLength (duration?)',
  'data_views.scriptedFieldsEnabled (boolean?|never)',
  'data_visualizer.resultLinks.fileBeat.enabled (boolean)',
  'dev_tools.deeplinks.navLinkStatus (string?)',
  'discover.experimental.enabledProfiles (array?)',
  'home.disableWelcomeScreen (boolean?)',
  'management.deeplinks.navLinkStatus (string?)',
  'map.emsFileApiUrl (string?)',
  'map.emsFontLibraryUrl (string?)',
  'map.emsLandingPageUrl (string?)',
  'map.emsTileApiUrl (string?)',
  'map.emsTileLayerId.bright (string?)',
  'map.emsTileLayerId.dark (string?)',
  'map.emsTileLayerId.desaturated (string?)',
  'map.emsUrl (string?)',
  'map.includeElasticMapsService (boolean?)',
  'map.tilemap.options.attribution (string?)',
  'map.tilemap.options.bounds (array?)',
  'map.tilemap.options.default (boolean?)',
  'map.tilemap.options.errorTileUrl (string?)',
  'map.tilemap.options.maxZoom (number?)',
  'map.tilemap.options.minZoom (number?)',
  'map.tilemap.options.reuseTiles (boolean?)',
  'map.tilemap.options.subdomains (array?)',
  'map.tilemap.options.tileSize (number?)',
  'map.tilemap.options.tms (boolean?)',
  'map.tilemap.url (string?)',
  'monitoring.kibana.collection.enabled (boolean?)',
  'monitoring.kibana.collection.interval (number?)',
  'monitoring.ui.ccs.enabled (boolean?)',
  'monitoring.ui.kibana.reporting.stale_status_threshold_seconds (number?)',
  'monitoring.ui.container.apm.enabled (boolean?)',
  'monitoring.ui.container.elasticsearch.enabled (boolean?)',
  'monitoring.ui.container.logstash.enabled (boolean?)',
  'monitoring.ui.enabled (boolean?)',
  'monitoring.ui.min_interval_seconds (number?)',
  'monitoring.ui.show_license_expiration (boolean?)',
  'monitoring.ui.logs.index (string?)',
  'newsfeed.fetchInterval (duration?)',
  'newsfeed.mainInterval (duration?)',
  'newsfeed.service.pathTemplate (string?)',
  'newsfeed.service.urlRoot (string?)',
  'no_data_page.analyticsNoDataPageFlavor (kibana?|serverless_search?|serverless_observability?|never)',
  'telemetry.allowChangingOptInStatus (boolean?)',
  'telemetry.appendServerlessChannelsSuffix (true?|false?)',
  'telemetry.banner (boolean?)',
  'telemetry.labels.branch (string?)',
  'telemetry.labels.ciBuildId (string?)',
  'telemetry.labels.ciBuildJobId (string?)',
  'telemetry.labels.ciBuildNumber (number?)',
  'telemetry.labels.environment (string?)',
  'telemetry.labels.ftrConfig (string?)',
  'telemetry.labels.gitRev (string?)',
  'telemetry.labels.isPr (boolean?)',
  'telemetry.labels.journeyName (string?)',
  'telemetry.labels.prId (number?)',
  'telemetry.labels.testBuildId (string?)',
  'telemetry.labels.testJobId (string?)',
  'telemetry.labels.ciBuildName (string?)',
  'telemetry.labels.performancePhase (string?)',
  'telemetry.labels.serverless (string?|never)', // Can only be set on Serverless.
  'telemetry.localShipper (boolean?|false?)',
  'telemetry.hidePrivacyStatement (boolean?)',
  'telemetry.optIn (boolean?)',
  'telemetry.sendUsageFrom (server?|browser?)',
  'telemetry.sendUsageTo (prod?|staging?)',
  'usageCollection.uiCounters.debug (boolean?)',
  'usageCollection.uiCounters.enabled (boolean?)',
  'input_control_vis.readOnly (boolean?|never)',
  'vis_type_gauge.readOnly (boolean?|never)',
  'vis_type_heatmap.readOnly (boolean?|never)',
  'vis_type_metric.readOnly (boolean?|never)',
  'vis_type_pie.readOnly (boolean?|never)',
  'vis_type_table.readOnly (boolean?|never)',
  'vis_type_tagcloud.readOnly (boolean?|never)',
  'vis_type_timelion.readOnly (boolean?|never)',
  'vis_type_timeseries.readOnly (boolean?|never)',
  'vis_type_vislib.readOnly (boolean?|never)',
  'vis_type_xy.readOnly (boolean?|never)',
  'vis_type_vega.enableExternalUrls (boolean?)',
  'xpack.actions.auth.ears.enableExperimental (boolean?)',
  'xpack.actions.auth.ears.enabled (boolean?)',
  'xpack.actions.email.domain_allowlist (array?)',
  'xpack.actions.email.services.enabled (array?)',
  'xpack.actions.inboundEvents.enabled (boolean?)',
  'xpack.actions.webhook.ssl.pfx.enabled (boolean?)',
  'xpack.apm.serviceMapEnabled (boolean?)',
  'xpack.apm.ui.enabled (boolean?)',
  'xpack.apm.ui.maxTraceItems (number?)',
  'xpack.apm.managedServiceUrl (string?|never)',
  'xpack.apm.serverlessOnboarding (boolean?|never)',
  'xpack.apm.latestAgentVersionsUrl (string?)',
  'xpack.apm.featureFlags.agentConfigurationAvailable (boolean?|true?)',
  'xpack.apm.featureFlags.configurableIndicesAvailable (boolean?|true?)',
  'xpack.apm.featureFlags.infrastructureTabAvailable (boolean?|true?)',
  'xpack.apm.featureFlags.infraUiAvailable (boolean?|true?)',
  'xpack.apm.featureFlags.migrationToFleetAvailable (boolean?|true?)',
  'xpack.apm.featureFlags.sourcemapApiAvailable (boolean?|true?)',
  'xpack.apm.featureFlags.storageExplorerAvailable (boolean?|true?)',
  // to be removed in https://github.com/elastic/kibana/issues/221904
  'xpack.apm.featureFlags.profilingIntegrationAvailable (boolean?)',
  'xpack.apm.serverless.enabled (true?|never)',
  'xpack.observability_onboarding.serverless.enabled (true?|never)',
  'xpack.cases.attachments.enabled (boolean?)',
  'xpack.cases.chat.enabled (boolean?)',
  'xpack.cases.files.allowedMimeTypes (array?)',
  'xpack.cases.files.maxSize (number?)',
  'xpack.cases.markdownPlugins.lens (boolean?)',
  'xpack.cases.stack.enabled (boolean?)',
  'xpack.cases.incrementalId.enabled (boolean?)',
  'xpack.cases.runWorkflows.enabled (boolean?)',
  'xpack.cases.templates.enabled (boolean?)',
  'xpack.ccr.ui.enabled (boolean?)',
  'xpack.cloud.base_url (string?)',
  'xpack.cloud.cname (string?)',
  'xpack.cloud.csp (string?)',
  'xpack.cloud.deployment_url (string?)',
  'xpack.cloud.deployments_url (string?)',
  'xpack.cloud.is_elastic_staff_owned (boolean?)',
  'xpack.cloud.trial_end_date (string?)',
  'xpack.cloud_integrations.experiments.launch_darkly.client_id (string)',
  'xpack.cloud_integrations.experiments.launch_darkly.client_log_level (none?|error?|warn?|info?|debug?)',
  'xpack.cloud_integrations.experiments.metadata_refresh_interval (duration?)',
  'xpack.cloud_integrations.full_story.org_id (string|string?)',
  // No PII. Just the list of event types we want to forward to FullStory.
  'xpack.cloud_integrations.full_story.eventTypesAllowlist (array?)',
  'xpack.cloud_integrations.full_story.pageVarsDebounceTime (duration?)',
  'xpack.cloud.id (string?)',
  'xpack.cloud.organization_id (string?)',
  'xpack.cloud.organization_url (string?)',
  'xpack.cloud.billing_url (string?)',
  'xpack.cloud.create_deployment_url (string?)',
  'xpack.cloud.create_project_url (string?|never)',
  'xpack.cloud.isSaasContainer (boolean?)',
  'xpack.cloud.profile_url (string?)',
  'xpack.cloud.performance_url (string?)',
  'xpack.cloud.users_and_roles_url (string?)',
  'xpack.cloud.projects_url (string?|never)',
  'xpack.cloudSecurityPosture.enableExperimental (array?)',
  // can't be used to infer urls or customer id from the outside
  'xpack.cloud.serverless.project_id (string?)',
  'xpack.cloud.serverless.project_name (string?)',
  'xpack.cloud.serverless.project_type (observability?|security?|search?|vectordb?)',
  'xpack.cloud.serverless.product_tier (never|complete?|essentials?|search_ai_lake?|logs_essentials?)',
  'xpack.cloud.serverless.orchestrator_target (string?)',
  'xpack.cloud.serverless.in_trial (boolean?)',
  'xpack.cloud.onboarding.default_solution (string?)',
  'xpack.cloud.managed_otlp.url (string?)',
  'xpack.cloud.region (string?)',
  'xpack.contentConnectors.ui.enabled (boolean?)',
  'xpack.discoverEnhanced.actions.exploreDataInChart.enabled (boolean?)',
  'xpack.discoverEnhanced.actions.exploreDataInContextMenu.enabled (boolean?)',
  'xpack.fleet.agents.enabled (boolean?)',
  'xpack.fleet.agentless.enabled (boolean?)',
  'xpack.fleet.agentless.isDefault (boolean?)',
  'xpack.fleet.agentless.customIntegrations.enabled (boolean?)',
  'xpack.fleet.enableExperimental (array?)',
  'xpack.fleet.experimentalFeatures (record?)',
  'xpack.fleet.internal.activeAgentsSoftLimit (number?)',
  'xpack.fleet.internal.excludeDataStreamTypes (array?)',
  'xpack.fleet.internal.fleetServerStandalone (boolean?)',
  'xpack.fleet.internal.onlyAllowAgentUpgradeToKnownVersions (boolean?)',
  'xpack.fleet.developer.maxAgentPoliciesWithInactivityTimeout (number?)',
  'xpack.fleet.integrationsHomeOverride (string?)',
  'xpack.fleet.prereleaseEnabledByDefault (boolean?)',
  'xpack.fleet.hideDashboards (boolean?)',
  'xpack.fleet.installIntegrationsKnowledge (boolean?)',
  'xpack.fleet.isAirGapped (boolean?)',
  'xpack.global_search.search_timeout (duration?)',
  'xpack.global_search_bar.input_max_limit (number?)',
  'xpack.graph.canEditDrillDownUrls (boolean?)',
  'xpack.graph.savePolicy (none?|config?|configAndData?|configAndDataWithConsent?)',
  'xpack.ilm.ui.enabled (boolean?)',
  'xpack.index_management.ui.enabled (boolean?)',
  'xpack.infra.sources.default.fields.message (array?)',
  'xpack.index_management.enableTogglingDataRetention (boolean?|never)',
  'xpack.index_management.enableProjectLevelRetentionChecks (boolean?|never)',
  /**
   * Feature flags bellow are conditional based on traditional/serverless offering
   */
  'xpack.infra.featureFlags.metricsExplorerEnabled (boolean?)',
  'xpack.infra.featureFlags.customThresholdAlertsEnabled (boolean?)',
  'xpack.infra.featureFlags.osqueryEnabled (boolean?)',
  'xpack.infra.featureFlags.inventoryThresholdAlertRuleEnabled (boolean?)',
  'xpack.infra.featureFlags.metricThresholdAlertRuleEnabled (boolean?)',
  'xpack.infra.featureFlags.logThresholdAlertRuleEnabled (boolean?)',
  'xpack.infra.featureFlags.logsUIEnabled (boolean?)',
  'xpack.infra.featureFlags.alertsAndRulesDropdownEnabled (boolean?)',
  // to be removed in https://github.com/elastic/kibana/issues/221904
  'xpack.infra.featureFlags.profilingEnabled (boolean?)',

  'xpack.index_management.enableIndexActions (boolean?|never)',
  'xpack.index_management.enableLegacyTemplates (boolean?|never)',
  'xpack.index_management.enableIndexStats (boolean?|never)',
  'xpack.index_management.enableDataStreamStats (boolean?|never)',
  'xpack.index_management.enableSizeAndDocCount (boolean?|never)',
  'xpack.index_management.editableIndexSettings (all?|limited?|never)',
  'xpack.index_management.enableMappingsSourceFieldSection (boolean?|never)',
  'xpack.index_management.dev.enableSemanticText (boolean?)',
  'xpack.index_management.enableFailureStoreRetentionDisabling (boolean?|never)',
  'xpack.index_management.enableIndexMode (boolean?|never)',
  'xpack.index_management.enableVectorCount (boolean?|never)',
  'xpack.intercepts.enabled (boolean?)',
  'xpack.license_management.ui.enabled (boolean?)',
  'xpack.maps.preserveDrawingBuffer (boolean?)',
  'xpack.maps.showMapsInspectorAdapter (boolean?)',
  'xpack.ml.ad.enabled (boolean)',
  'xpack.ml.dfa.enabled (boolean)',
  'xpack.ml.nlp.enabled (boolean)',
  'xpack.ml.nlp.modelDeployment.allowStaticAllocations (boolean)',
  'xpack.ml.nlp.modelDeployment.vCPURange.high.max (number)',
  'xpack.ml.nlp.modelDeployment.vCPURange.high.min (number)',
  'xpack.ml.nlp.modelDeployment.vCPURange.high.static (number?)',
  'xpack.ml.nlp.modelDeployment.vCPURange.high.maxThreads (number)',
  'xpack.ml.nlp.modelDeployment.vCPURange.low.max (number)',
  'xpack.ml.nlp.modelDeployment.vCPURange.low.min (number)',
  'xpack.ml.nlp.modelDeployment.vCPURange.low.static (number?)',
  'xpack.ml.nlp.modelDeployment.vCPURange.low.maxThreads (number)',
  'xpack.ml.nlp.modelDeployment.vCPURange.medium.max (number)',
  'xpack.ml.nlp.modelDeployment.vCPURange.medium.min (number)',
  'xpack.ml.nlp.modelDeployment.vCPURange.medium.static (number?)',
  'xpack.ml.nlp.modelDeployment.vCPURange.medium.maxThreads (number)',
  'xpack.osquery.actionEnabled (boolean?)',
  'xpack.osquery.enableExperimental (array?)',
  'xpack.remote_clusters.ui.enabled (boolean?)',
  'xpack.ingest_pipelines.enableManageProcessors (boolean?|never)',
  'xpack.rollup.ui.enabled (boolean?)',
  'xpack.saved_object_tagging.cache_refresh_interval (duration?)',

  'xpack.searchAssistant.ui.enabled (boolean?)',
  'xpack.searchInferenceEndpoints.ui.enabled (boolean?)',
  'xpack.security.loginAssistanceMessage (string?)',
  'xpack.security.sameSiteCookies (Strict?|Lax?|None?)',
  'xpack.security.showInsecureClusterWarning (boolean?)',
  'xpack.security.showNavLinks (boolean?)',
  'xpack.security.ui.roleMappingManagementEnabled (boolean?|never)',
  'xpack.security.ui.userManagementEnabled (boolean?|never)',
  'xpack.security.uiam.enabled (boolean?|never)',
  'xpack.security.roleManagementEnabled (boolean?|never)',
  'xpack.security.serviceAccounts.enabled (boolean?)',
  'xpack.spaces.maxSpaces (number?)',
  'xpack.spaces.allowFeatureVisibility (false|boolean?)',
  'xpack.spaces.allowSolutionVisibility (false|boolean?)',
  'xpack.spaces.initialSolutionSetup.enabled (boolean?|false?)',
  'xpack.securitySolution.enableExperimental (array?)',
  'xpack.securitySolution.entityAnalytics.alertEntityIdBackfill.enabled (boolean?)',
  'xpack.securitySolution.prebuiltRulesPackageVersion (string?)',
  'xpack.securitySolution.offeringSettings (record?)',
  'xpack.securitySolution.entityAnalytics.assetCriticality.csvUpload.errorRetries (number?)',
  'xpack.securitySolution.entityAnalytics.assetCriticality.csvUpload.maxBulkRequestBodySizeBytes (number?)',
  'xpack.securitySolution.entityAnalytics.entityStore.developer.pipelineDebugMode (boolean?)',
  'xpack.securitySolution.entityAnalytics.entityStore.frequency (duration?)',
  'xpack.securitySolution.entityAnalytics.entityStore.syncDelay (duration?)',
  'xpack.securitySolution.entityAnalytics.monitoring.privileges.users.csvUpload.errorRetries (number?)',
  'xpack.securitySolution.entityAnalytics.monitoring.privileges.users.csvUpload.maxBulkRequestBodySizeBytes (number?)',
  'xpack.securitySolution.entityAnalytics.monitoring.privileges.users.maxPrivilegedUsersAllowed (number?)',
  'xpack.securitySolution.entityAnalytics.riskEngine.alertSampleSizePerShard (number?)',
  'xpack.securitySolution.entityAnalytics.riskEngine.esqlProfiling (boolean?)',
  'xpack.securitySolution.entityAnalytics.riskEngine.esqlProfilingInterval (number?)',
  'xpack.snapshot_restore.slm_ui.enabled (boolean?)',
  'xpack.snapshot_restore.ui.enabled (boolean?)',
  'xpack.stack_connectors.enableExperimental (array?)',
  'xpack.trigger_actions_ui.enableExperimental (array?)',
  'xpack.trigger_actions_ui.enableGeoTrackingThresholdAlert (boolean?)',
  'xpack.trigger_actions_ui.rules.enabled (boolean?)',
  'xpack.alerting.rules.run.alerts.max (number?)',
  'xpack.alerting.rulesSettings.enabled (boolean?)',
  'xpack.alerting.disabledRuleTypes (array?)',
  'xpack.alerting.enabledRuleTypes (array?)',
  'xpack.upgrade_assistant.featureSet.migrateSystemIndices (boolean?)',
  'xpack.upgrade_assistant.featureSet.mlSnapshots (boolean?)',
  'xpack.upgrade_assistant.featureSet.reindexCorrectiveActions (boolean?)',
  'xpack.upgrade_assistant.featureSet.migrateDataStreams (boolean?)',
  'xpack.upgrade_assistant.ui.enabled (boolean?)',
  'xpack.synthetics.secretConnections.enabled (boolean?)',
  'xpack.observability.unsafe.alertDetails.metrics.enabled (boolean?)',
  'xpack.observability.unsafe.alertDetails.logs.enabled (boolean?)',
  'xpack.observability.unsafe.alertDetails.uptime.enabled (boolean?)',
  'xpack.observability.unsafe.alertDetails.observability.enabled (boolean?)',
  'xpack.observability.unsafe.thresholdRule.enabled (boolean?)',
  'xpack.observability_onboarding.ui.enabled (boolean?)',
  'xpack.observabilityAIAssistant.scope (observability?|search?)',
  'xpack.observabilityAiAssistantManagement.logSourcesEnabled (boolean?)',
  'xpack.observabilityAiAssistantManagement.spacesEnabled (boolean?)',
  'xpack.observability.managedOtlpServiceUrl (string?)',
  'share.new_version.enabled (boolean?)',
  'aiAssistantManagementSelection.preferredAIAssistantType (default?|never?|observability?|security?)',
  'aiAssistantManagementSelection.preferredChatExperience (classic?|agent?)',
  'xpack.genAiSettings.showAiBreadcrumb (boolean?)',
  'xpack.genAiSettings.showSpacesIntegration (boolean?)',
  'xpack.genAiSettings.showAiAssistantsVisibilitySetting (boolean?)',
  'xpack.genAiSettings.showChatExperienceSetting (boolean?)',
  /**
   * Rule form V2 feature flags
   */
  'discover.experimental.ruleFormV2Enabled (boolean?)',
  'xpack.infra.featureFlags.ruleFormV2Enabled (boolean?)',
  'xpack.legacy_uptime.experimental.ruleFormV2Enabled (boolean?)',
  'xpack.ml.experimental.ruleFormV2.enabled (boolean)',
  'xpack.transform.experimental.ruleFormV2Enabled (boolean?)',
  'xpack.apm.featureFlags.ruleFormV2Enabled (boolean?)',
  'xpack.observability.unsafe.ruleFormV2.enabled (boolean?)',
  'xpack.slo.experimental.ruleFormV2.enabled (boolean?)',

  // temporary feature flag, to be removed when cps is released
  'cps.cpsEnabled (boolean?|never)',

  'xpack.agenticInvestigations.escalations.enabled (boolean?)',
  'xpack.aiAnonymizationSettings.patternTester.enabled (boolean?)',
  'xpack.alerting_v2.rules.minimumScheduleInterval (string?)',
  'xpack.alertzero.enabled (boolean?)',
  'xpack.automatic_import.enableExperimental (array?)',
  'xpack.cloud_connect.cloudUrl (string?)',
  'xpack.dataFederation.awsCloudFormationTemplateUrl (string?)',
  'xpack.dataFederation.enableAzureDataSourceType (boolean?)',
  'xpack.dataFederation.enableFederatedIdentityAuth (boolean?)',
  'xpack.dataFederation.enableGoogleCloudStorageDataSourceType (boolean?)',
  'xpack.dataFederation.enabled (boolean?)',
  'xpack.dataFederation.workloadIdentityIssuerUrl (string?)',
  'xpack.mitreAttack.managedSourceEnabled (boolean?)',
  'xpack.timelines.enableExperimental (array?)',

  /**
   * Plugins below are disabled by default. They are listed because this test force-enables every plugin.
   */
  'xpack.dataUsage.enableExperimental (array?)',
  'xpack.evals.enabled (boolean?)',
  'xpack.inbox.enabled (boolean?)',
  'xpack.reporting.csv.maxRows (number?)',
  'xpack.reporting.csv.scroll.duration (string?)',
  'xpack.reporting.csv.scroll.size (number?)',
  'xpack.reporting.csv.scroll.strategy (pit?|scroll?)',
  'xpack.reporting.export_types.csv.enabled (boolean?)',
  'xpack.reporting.export_types.pdf.enabled (boolean?)',
  'xpack.reporting.export_types.png.enabled (boolean?)',
  'xpack.reporting.poll.jobCompletionNotifier.interval (number?)',
  'xpack.reporting.poll.jobCompletionNotifier.intervalErrorMultiplier (number?)',
  'xpack.reporting.poll.jobsRefresh.interval (number?)',
  'xpack.reporting.poll.jobsRefresh.intervalErrorMultiplier (number?)',
  'xpack.reporting.statefulSettings.enabled (boolean?)',

  /**
   * Serverless-only plugins.
   */
  'xpack.securitySolutionServerless.enableExperimental (array?)',
  'xpack.securitySolutionServerless.inaccessibleApps (array?)',
  'xpack.securitySolutionServerless.productTypes (array?)',
  'xpack.serverless.plugin.developer.projectSwitcher.currentType (security|observability|search|vectordb)',
  'xpack.serverless.plugin.developer.projectSwitcher.enabled (boolean?)',
];

/**
 * Config keys exposed to the browser on anonymous pages, such as the login page.
 * Only plugins with `enabledOnAnonymousPages` and their required plugins are loaded on these pages.
 *
 * The same notes apply as for {@link EXPECTED_EXPOSED_CONFIG_KEYS}.
 */
const EXPECTED_ANONYMOUS_EXPOSED_CONFIG_KEYS = [
  'xpack.security.loginAssistanceMessage (string?)',
  'xpack.security.sameSiteCookies (Strict?|Lax?|None?)',
  'xpack.security.showInsecureClusterWarning (boolean?)',
  'xpack.security.showNavLinks (boolean?)',
  'xpack.security.ui.roleMappingManagementEnabled (boolean?|never)',
  'xpack.security.ui.userManagementEnabled (boolean?|never)',
  'xpack.security.uiam.enabled (boolean?|never)',
  'xpack.security.roleManagementEnabled (boolean?|never)',
  'xpack.security.serviceAccounts.enabled (boolean?)',

  'telemetry.allowChangingOptInStatus (boolean?)',
  'telemetry.appendServerlessChannelsSuffix (true?|false?)',
  'telemetry.banner (boolean?)',
  'telemetry.labels.branch (string?)',
  'telemetry.labels.ciBuildId (string?)',
  'telemetry.labels.ciBuildJobId (string?)',
  'telemetry.labels.ciBuildNumber (number?)',
  'telemetry.labels.environment (string?)',
  'telemetry.labels.ftrConfig (string?)',
  'telemetry.labels.gitRev (string?)',
  'telemetry.labels.isPr (boolean?)',
  'telemetry.labels.journeyName (string?)',
  'telemetry.labels.prId (number?)',
  'telemetry.labels.testBuildId (string?)',
  'telemetry.labels.testJobId (string?)',
  'telemetry.labels.ciBuildName (string?)',
  'telemetry.labels.performancePhase (string?)',
  'telemetry.labels.serverless (string?|never)', // Can only be set on Serverless.
  'telemetry.localShipper (boolean?|false?)',
  'telemetry.hidePrivacyStatement (boolean?)',
  'telemetry.optIn (boolean?)',
  'telemetry.sendUsageFrom (server?|browser?)',
  'telemetry.sendUsageTo (prod?|staging?)',
  'usageCollection.uiCounters.debug (boolean?)',
  'usageCollection.uiCounters.enabled (boolean?)',
];

/**
 * Config keys exposed to the browser by preboot plugins, such as interactive setup.
 * These pages render before Kibana can authenticate anyone, so keep this list as short as possible.
 *
 * The same notes apply as for {@link EXPECTED_EXPOSED_CONFIG_KEYS}.
 */
const EXPECTED_PREBOOT_EXPOSED_CONFIG_KEYS: readonly string[] = [];

if (getFips() === 0) {
  describe('config keys exposed to the browser', () => {
    let root: Root;

    beforeAll(async () => {
      const settings = {
        logging: {
          loggers: [{ name: 'root', level: 'error', appenders: ['console'] }],
        },
      };

      set(settings, PLUGIN_SYSTEM_ENABLE_ALL_PLUGINS_CONFIG_PATH, true);

      // `dev: false` leaves out the dev-only plugins, which never run in production.
      // Plugin discovery happens during preboot, so we don't need to set up any plugins.
      root = createRootWithCorePlugins(settings, {
        basePath: false,
        cache: false,
        dev: false,
        disableOptimizer: true,
        silent: false,
        dist: false,
        oss: false,
        runExamples: false,
        watch: false,
      });

      await root.preboot();
    });

    afterAll(async () => {
      await root?.shutdown();
    });

    const getExposedConfigKeysForPage = ({
      pluginType,
      isAnonymousPage,
    }: {
      pluginType: 'preboot' | 'standard';
      isAnonymousPage: boolean;
    }): string[] => {
      // eslint-disable-next-line dot-notation
      const { uiPlugins } = root['server']['discoveredPlugins'][pluginType];
      // eslint-disable-next-line dot-notation
      const configDescriptors = root['server']['plugins']['pluginConfigDescriptors'];
      const exposedConfigKeys: string[] = [];
      for (const [pluginId, { configPath }] of filterUiPlugins({ uiPlugins, isAnonymousPage })) {
        const configDescriptor = configDescriptors.get(pluginId);
        if (!configDescriptor) {
          continue;
        }
        const pluginConfigPath = Array.isArray(configPath) ? configPath.join('.') : configPath;
        for (const [key, type] of Object.entries(getExposedConfigKeys(configDescriptor))) {
          exposedConfigKeys.push(`${pluginConfigPath}.${key} (${type})`);
        }
      }
      return exposedConfigKeys;
    };

    // We don't assert that the actual and expected lists are equal, because test failure messages with large arrays are hard to grok.
    // Instead, we take the difference between the two arrays and assert them separately. That way it's abundantly clear when the test
    // fails that (A) Kibana is exposing a new key, or (B) Kibana is no longer exposing a key.
    const expectNoDifference = (actual: string[], expected: readonly string[]) => {
      const extra = difference(actual, expected).sort();
      const missing = difference(expected, actual).sort();
      try {
        expect({ extra, missing }).toEqual({ extra: [], missing: [] });
      } catch (error) {
        error.message = `${EXPOSED_CONFIG_SETTINGS_ERROR}\n\n${error.message}`;
        throw error;
      }
    };

    it('exposes plugin config settings to authenticated users', () => {
      expectNoDifference(
        getExposedConfigKeysForPage({ pluginType: 'standard', isAnonymousPage: false }),
        EXPECTED_EXPOSED_CONFIG_KEYS
      );
    });

    it('exposes plugin config settings to unauthenticated users', () => {
      expectNoDifference(
        getExposedConfigKeysForPage({ pluginType: 'standard', isAnonymousPage: true }),
        EXPECTED_ANONYMOUS_EXPOSED_CONFIG_KEYS
      );
    });

    it('exposes preboot plugin config settings to unauthenticated users', () => {
      // Preboot plugins (such as interactive setup) render before Kibana can authenticate anyone.
      expectNoDifference(
        getExposedConfigKeysForPage({ pluginType: 'preboot', isAnonymousPage: false }),
        EXPECTED_PREBOOT_EXPOSED_CONFIG_KEYS
      );
    });
  });
} else {
  it('is running in FIPS mode, skipping tests since they fail due to FIPS overrides', () => {
    expect(getFips()).toBe(1);
  });
}
