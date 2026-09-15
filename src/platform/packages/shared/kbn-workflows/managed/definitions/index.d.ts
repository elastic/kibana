export { ATTACK_DISCOVERY_ALERT_RETRIEVAL_WORKFLOW_ID, ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID, ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID, ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID, ATTACK_DISCOVERY_SKILL_ALERT_RETRIEVAL_WORKFLOW_ID, ATTACK_DISCOVERY_SKILL_REPORT_WORKFLOW_ID, ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID, } from './discoveries';
export { EXAMPLE_MANAGED_WORKFLOW_ID } from './workflows_extensions_example';
export { SECURITY_ALERT_ANALYSIS_WORKFLOW, SECURITY_ALERT_ANALYSIS_WORKFLOW_ID, } from './alert_analysis';
export { SIGNIFICANT_EVENTS_KI_FEATURES_IDENTIFICATION_WORKFLOW_ID, SIGNIFICANT_EVENTS_KI_QUERIES_GENERATION_WORKFLOW_ID, SIGNIFICANT_EVENTS_KI_ONBOARDING_WORKFLOW_ID, SIGNIFICANT_EVENTS_KI_CONTINUOUS_ONBOARDING_WORKFLOW_ID, SIGNIFICANT_EVENTS_KI_SYNC_WORKFLOW_ID, } from './significant_events/knowledge_indicators';
export { SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_WORKFLOW_ID, SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_WORKFLOW_ID, SIGNIFICANT_EVENTS_MEMORY_CONVERSATION_SCRAPER_WORKFLOW_ID, SIGNIFICANT_EVENTS_MEMORY_GAP_DETECTION_WORKFLOW_ID, } from './significant_events/memory';
export { SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID, SIGNIFICANT_EVENTS_CLEANUP_WORKFLOW_ID, SIGNIFICANT_EVENTS_DISCOVERY_WORKFLOW_ID, SIGNIFICANT_EVENTS_INVESTIGATION_COMPLETED_WORKFLOW_ID, SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID, SIGNIFICANT_EVENTS_SCHEDULED_DETECTION_WORKFLOW_ID, SIGNIFICANT_EVENTS_SCHEDULED_REVIEW_WORKFLOW_ID, } from './significant_events';
export { SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID } from './nightshift_investigations/investigation';
export { NIGHTSHIFT_AUTOMATION_FLOOR_WORKFLOW_ID, } from './nightshift_investigations/watch_floor';
export { CREATE_INVESTIGATION_PROPOSAL_WORKFLOW_ID } from './agentic_investigations';
export { ALERTZERO_DETECTION_COVERAGE_WORKFLOW_ID, ALERTZERO_ACTION_CREATE_RULE_WORKFLOW_ID, ALERTZERO_ACTION_WORKFLOW_IDS, ALERTZERO_MANAGED_WORKER_WORKFLOW_IDS, ALERTZERO_RULE_CREATION_WORKFLOW_ID, ALERTZERO_RULE_PREVIEW_WORKFLOW_ID, ALERTZERO_RULE_TUNING_REVIEW_WORKFLOW_ID, ALERTZERO_RULE_TUNING_WORKER_WORKFLOW_ID, ALERTZERO_RULE_WORKFLOW_IDS, ALERTZERO_WORKER_DARK_CONTINUOUS_THREAT_HUNT_WORKFLOW_ID, ALERTZERO_WORKER_DETECTION_RULE_CREATION_WORKFLOW_ID, ALERTZERO_WORKER_DETECTION_RULE_TUNING_WORKFLOW_ID, ALERTZERO_WORKER_FLOOR_ALERT_TRIAGE_WORKFLOW_ID, ALERTZERO_WORKER_FLOOR_ATTACK_DISCOVERY_WORKFLOW_ID, } from './alertzero';
export { THREAT_INTEL_ATTRIBUTE_ALERTS_WORKFLOW_ID, THREAT_INTEL_ENRICH_REPORT_WORKFLOW_ID, THREAT_INTEL_INGEST_FEEDS_WORKFLOW_ID, THREAT_INTEL_WORKFLOW_IDS, } from './threat_intel';
export declare const managedWorkflowDefinitions: readonly [{
    readonly billable: false;
    readonly id: "system-attack-discovery-alert-retrieval";
    readonly management: {
        readonly enablement: 'enforced';
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: 'discoveries';
    readonly version: 2;
    readonly yaml: string;
}, {
    readonly billable: false;
    readonly id: "system-attack-discovery-custom-validation-example";
    readonly management: {
        readonly enablement: 'enforced';
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: 'discoveries';
    readonly version: 4;
    readonly yaml: string;
}, {
    readonly billable: false;
    readonly id: "system-attack-discovery-generation";
    readonly management: {
        readonly enablement: 'enforced';
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: 'discoveries';
    readonly version: 2;
    readonly yaml: string;
}, {
    readonly billable: false;
    readonly id: "system-attack-discovery-run-example";
    readonly management: {
        readonly enablement: 'enforced';
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: 'discoveries';
    readonly version: 3;
    readonly yaml: string;
}, {
    readonly billable: false;
    readonly id: "system-attack-discovery-skill-alert-retrieval";
    readonly management: {
        readonly enablement: 'enforced';
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: 'discoveries';
    readonly version: 13;
    readonly yaml: string;
}, {
    readonly billable: false;
    readonly id: "system-attack-discovery-skill-report";
    readonly management: {
        readonly enablement: 'enforced';
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: 'discoveries';
    readonly version: 4;
    readonly yaml: string;
}, {
    readonly billable: false;
    readonly id: "system-attack-discovery-validate";
    readonly management: {
        readonly enablement: 'enforced';
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: 'discoveries';
    readonly version: 4;
    readonly yaml: string;
}, {
    readonly id: "system-example-greeting";
    readonly pluginId: 'workflowsExtensionsExample';
    readonly version: 2;
    readonly billable: false;
    readonly visibility: {
        readonly selectors: readonly ["rule_action"];
    };
    readonly yamlTemplate: ({ recipient }: import("./workflows_extensions_example").ExampleManagedWorkflowTemplateValues) => string;
    readonly management: {
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
        readonly enablement: 'restorable';
    };
}, {
    readonly id: "system-security-alert-analysis";
    readonly pluginId: 'securitySolution';
    readonly version: 3;
    readonly billable: false;
    readonly visibility: {
        readonly selectors: readonly ["rule_action"];
        readonly solutions: readonly ["security"];
    };
    readonly yaml: string;
    readonly management: {
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
        readonly enablement: 'enforced';
    };
}, {
    readonly id: "system-streams-ki-features-identification";
    readonly pluginId: 'significantEvents';
    readonly version: 4;
    readonly billable: false;
    readonly yaml: string;
    readonly management: {
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
        readonly enablement: 'enforced';
    };
}, {
    readonly id: "system-streams-ki-queries-generation";
    readonly pluginId: 'significantEvents';
    readonly version: 2;
    readonly billable: false;
    readonly yaml: string;
    readonly management: {
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
        readonly enablement: 'enforced';
    };
}, {
    readonly id: "system-streams-ki-onboarding";
    readonly pluginId: 'significantEvents';
    readonly version: 7;
    readonly billable: false;
    readonly yaml: string;
    readonly management: {
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
        readonly enablement: 'enforced';
    };
}, {
    readonly id: "system-significant-events-memory-synthesis";
    readonly pluginId: 'significantEvents';
    readonly version: 4;
    readonly billable: false;
    readonly yaml: string;
    readonly management: {
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
        readonly enablement: 'restorable';
    };
}, {
    readonly id: "system-significant-events-memory-consolidation";
    readonly pluginId: 'significantEvents';
    readonly version: 4;
    readonly billable: false;
    readonly yaml: string;
    readonly management: {
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
        readonly enablement: 'restorable';
    };
}, {
    readonly id: "system-significant-events-memory-conversation-scraper";
    readonly pluginId: 'significantEvents';
    readonly version: 4;
    readonly billable: false;
    readonly yaml: string;
    readonly management: {
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
        readonly enablement: 'restorable';
    };
}, {
    readonly id: "system-significant-events-memory-gap-detection";
    readonly pluginId: 'significantEvents';
    readonly version: 4;
    readonly billable: false;
    readonly yaml: string;
    readonly management: {
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
        readonly enablement: 'restorable';
    };
}, {
    readonly id: "system-streams-ki-continuous-onboarding";
    readonly pluginId: 'significantEvents';
    readonly version: 3;
    readonly billable: false;
    readonly yaml: string;
    readonly management: {
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
        readonly enablement: 'restorable';
    };
}, {
    readonly id: "system-streams-ki-sync";
    readonly pluginId: 'significantEvents';
    readonly version: 1;
    readonly billable: false;
    readonly yaml: string;
    readonly management: {
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
        readonly enablement: 'restorable';
    };
}, {
    readonly id: "system-significant-events-cleanup";
    readonly pluginId: 'significantEvents';
    readonly version: 1;
    readonly billable: false;
    readonly yaml: string;
    readonly management: {
        readonly lifecycle: 'dynamic';
        readonly versionStrategy: 'auto';
        readonly enablement: 'restorable';
    };
}, {
    readonly id: "system-significant-events-detection";
    readonly pluginId: 'significantEvents';
    readonly version: 7;
    readonly billable: false;
    readonly yaml: string;
    readonly management: {
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
        readonly enablement: 'enforced';
    };
}, {
    readonly id: "system-significant-events-discovery";
    readonly pluginId: 'significantEvents';
    readonly version: 20;
    readonly billable: false;
    readonly yaml: string;
    readonly management: {
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
        readonly enablement: 'enforced';
    };
}, {
    readonly id: "system-significant-events-investigation-completed";
    readonly pluginId: 'significantEvents';
    readonly version: 1;
    readonly billable: false;
    readonly yaml: string;
    readonly management: {
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
        readonly enablement: 'enforced';
    };
}, {
    readonly id: "system-significant-events-orchestrator";
    readonly pluginId: 'significantEvents';
    readonly version: 4;
    readonly billable: false;
    readonly yaml: string;
    readonly management: {
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
        readonly enablement: 'enforced';
    };
}, {
    readonly id: "system-nightshift-automation-floor";
    readonly pluginId: 'nightshiftInvestigations';
    readonly version: 1;
    readonly billable: false;
    readonly yaml: string;
    readonly management: {
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
        readonly enablement: 'restorable';
    };
}, {
    readonly id: "system-significant-events-investigation";
    readonly pluginId: 'nightshiftInvestigations';
    readonly version: 11;
    readonly billable: false;
    readonly yaml: string;
    readonly management: {
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
        readonly enablement: 'restorable';
    };
}, {
    readonly id: "system-significant-events-scheduled-detection";
    readonly pluginId: 'significantEvents';
    readonly version: 3;
    readonly billable: false;
    readonly yamlTemplate: ({ detectionIntervalMinutes, detectionBucketIntervalMinutes, detectionLookbackMinutes, targetCoverageMinutes, }: import("./significant_events/scheduled").SignificantEventsScheduledDetectionWorkflowTemplateValues) => string;
    readonly management: {
        readonly lifecycle: 'dynamic';
        readonly versionStrategy: 'auto';
        readonly enablement: 'restorable';
    };
}, {
    readonly id: "system-significant-events-scheduled-review";
    readonly pluginId: 'significantEvents';
    readonly version: 6;
    readonly billable: false;
    readonly yamlTemplate: ({ reviewIntervalMinutes, discoveryBatchSize, maxReviewPasses, flakyRuleDetectionThreshold, flakyRuleProbeAfterMinutes, flakyRuleExemptSeverityScore, }: import("./significant_events/scheduled").SignificantEventsScheduledReviewWorkflowTemplateValues) => string;
    readonly management: {
        readonly lifecycle: 'dynamic';
        readonly versionStrategy: 'auto';
        readonly enablement: 'restorable';
    };
}, {
    readonly billable: false;
    readonly id: "system-security-floor-alert-triage";
    readonly management: {
        readonly enablement: 'restorable';
        readonly lifecycle: 'dynamic';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: "alertzero";
    readonly version: 1;
    readonly yamlTemplate: (values: import("./alertzero/worker_template_values").CommonWorkerTemplateValues) => string;
}, {
    readonly billable: false;
    readonly id: "system-security-floor-attack-discovery";
    readonly management: {
        readonly enablement: 'restorable';
        readonly lifecycle: 'dynamic';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: "alertzero";
    readonly version: 2;
    readonly yamlTemplate: (values: import("./alertzero/worker_template_values").ScheduledWorkerTemplateValues) => string;
}, {
    readonly billable: false;
    readonly id: "system-security-dark-continuous-threat-hunt";
    readonly management: {
        readonly enablement: 'restorable';
        readonly lifecycle: 'dynamic';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: "alertzero";
    readonly version: 2;
    readonly yamlTemplate: (values: import("./alertzero/worker_template_values").CommonWorkerTemplateValues) => string;
}, {
    readonly billable: false;
    readonly id: "system-security-detection-rule-tuning";
    readonly management: {
        readonly enablement: 'restorable';
        readonly lifecycle: 'dynamic';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: "alertzero";
    readonly version: 4;
    readonly yamlTemplate: (values: import("./alertzero/worker_template_values").ScheduledWorkerTemplateValues) => string;
}, {
    readonly billable: false;
    readonly id: "system-security-detection-rule-creation";
    readonly management: {
        readonly enablement: 'restorable';
        readonly lifecycle: 'dynamic';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: "alertzero";
    readonly version: 1;
    readonly yamlTemplate: (values: import("./alertzero/worker_template_values").CommonWorkerTemplateValues) => string;
}, {
    readonly billable: false;
    readonly id: "system-security-rule-preview";
    readonly management: {
        readonly enablement: 'restorable';
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: "alertzero";
    readonly version: 2;
    readonly yaml: string;
}, {
    readonly billable: false;
    readonly id: "system-security-rule-tuning-worker";
    readonly management: {
        readonly enablement: 'restorable';
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: "alertzero";
    readonly version: 23;
    readonly yaml: string;
}, {
    readonly billable: false;
    readonly id: "system-security-rule-tuning-review";
    readonly management: {
        readonly enablement: 'restorable';
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: "alertzero";
    readonly version: 14;
    readonly yaml: string;
}, {
    readonly billable: false;
    readonly id: "system-security-rule-creation";
    readonly management: {
        readonly enablement: 'restorable';
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: "alertzero";
    readonly version: 2;
    readonly yaml: string;
}, {
    readonly billable: false;
    readonly id: "system-security-detection-coverage";
    readonly management: {
        readonly enablement: 'restorable';
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: "alertzero";
    readonly version: 1;
    readonly yaml: string;
}, {
    readonly billable: false;
    readonly id: "system-create-investigation-proposal";
    readonly management: {
        readonly enablement: 'enforced';
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: "agenticInvestigations";
    readonly version: 1;
    readonly yaml: string;
}, {
    readonly billable: false;
    readonly id: "system-alertzero-action-create-rule";
    readonly management: {
        readonly enablement: 'restorable';
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: "alertzero";
    readonly version: 1;
    readonly yaml: string;
}, {
    readonly billable: false;
    readonly id: "system-security-threat-intel-ingest-feeds";
    readonly management: {
        readonly enablement: 'restorable';
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: "securitySolution";
    readonly version: 1;
    readonly visibility: {
        readonly solutions: readonly ['security'];
    };
    readonly yaml: string;
}, {
    readonly billable: false;
    readonly id: "system-security-threat-intel-enrich-report";
    readonly management: {
        readonly enablement: 'restorable';
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: "securitySolution";
    readonly version: 1;
    readonly visibility: {
        readonly solutions: readonly ['security'];
    };
    readonly yaml: string;
}, {
    readonly billable: false;
    readonly id: "system-security-threat-intel-attribute-alerts";
    readonly management: {
        readonly enablement: 'restorable';
        readonly lifecycle: 'static';
        readonly versionStrategy: 'auto';
    };
    readonly pluginId: "securitySolution";
    readonly version: 1;
    readonly visibility: {
        readonly solutions: readonly ['security'];
    };
    readonly yaml: string;
}];
