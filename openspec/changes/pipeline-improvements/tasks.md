## 1. Foundation: Comprehensive Testing

- [x] 1.1 Create unit tests for `deduplicateAlerts` (hash & Jaccard logic)
- [x] 1.2 Create unit tests for `extractEntitiesFromAlerts` and ECS mappings
- [x] 1.3 Create unit tests for `matchAlertsToCases` strategies
- [x] 1.4 Create unit tests for `triggerCaseAttackDiscovery`
- [x] 1.5 Create mock-based integration test for the full pipeline orchestrator

## 2. Multi-Space Support

- [x] 2.1 Refactor `orchestrator.ts` to accept `spaceId` and resolve the correct alert index pattern instead of hardcoding `.alerts-security.alerts-default`
- [x] 2.2 Update `processed_alert_tracker.ts` to ensure tracking indices are space-aware
- [x] 2.3 Update API routes and workflow steps to pass `spaceId` from request context

## 3. Asynchronous Execution (Task Manager)

- [x] 3.1 Define a new Kibana Task Manager task type for `alert_investigation_pipeline_run`
- [x] 3.2 Implement task runner logic that executes the pipeline stages asynchronously
- [x] 3.3 Define task state persistence (running, completed, failed) via Task Manager state
- [x] 3.4 Add exponential backoff for consecutive failures

## 4. Performance & Bulk Operations

- [x] 4.1 Refactor `runCaseMatchingAndAttachment` to use bulk operations for case attachments instead of individual `casesClient.attachments.add`
- [x] 4.2 Add memory caps and pagination for fetching unprocessed alerts (PIT + search_after)
- [x] 4.3 Implement an in-memory TTL cache for case observables to avoid full case fetching on every pipeline run

## 5. Security & Audit Logging

- [x] 5.1 Implement `PipelineAuditLogger` for structured audit logging of pipeline events
- [x] 5.2 Add schema validation (using `@kbn/config-schema`) for all pipeline inputs to prevent injection or crashes
- [ ] 5.3 Enforce user RBAC privileges when the pipeline is triggered manually via the API (SKIPPED)

## 6. UI & Observability

- [x] 6.1 Implement `PipelineMetricsCollector` for tracking execution metrics (success rate, cases created, errors)
- [x] 6.2 Implement `PipelineHealthStatus` API with health classification (healthy/degraded/unhealthy)
- [x] 6.3 Expose internal APIs for pipeline health, metrics, and config (GET/PUT routes)
- [x] 6.4 Build React dashboard (`PipelineDashboard`) and settings form (`PipelineSettings`) with EUI components

## 7. Advanced Correlation & ML (P2)

- [x] 7.1 Define `EnrichmentStrategy` interface and `EnrichmentRegistry` for pipeline extensions
- [x] 7.2 Implement Threat Intelligence enrichment module that queries active TI indicators
- [x] 7.3 Implement ML anomaly score lookup to boost alert severity before case matching
- [ ] 7.4 Add SOAR webhook integration in the `triggerCaseAttackDiscovery` stage for high-severity cases (SKIPPED)
- [x] 7.5 Wire `EnrichmentRegistry` into `runInvestigationPipeline` orchestrator (accepts optional registry, runs after entity extraction)
- [x] 7.6 Implement MITRE ATT&CK correlation enrichment strategy (technique extraction, attack chain detection, severity scoring)

## 8. Additional Testing

- [x] 8.1 Create comprehensive unit tests for `processed_alert_tracker.ts` (ensureTrackerIndex, getProcessedAlertIds, updateProcessedAlertIds with OCC, computeDeltaAlertIds)
- [x] 8.2 Create unit tests for `MitreAttackEnrichment` (technique extraction, subtechniques, chain detection, severity, space isolation, framework filtering)
- [x] 8.3 Add orchestrator integration tests for enrichment pipeline (registry wiring, default enrichment stats)
