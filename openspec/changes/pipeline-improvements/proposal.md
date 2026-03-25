## Why

The current implementation of the Alert-to-Investigation Pipeline is a solid proof-of-concept (Spike) but has significant gaps when compared to enterprise security operation standards. It currently has a hardcoded single-space architecture, synchronous blocking execution that scales poorly, lacks UI and operational observability, lacks fundamental security and compliance logging, and is completely devoid of tests. This change implements the critical P0, P1, and P2 improvements needed to bring this pipeline to a production-ready, enterprise-grade state, solving immediate scalability and usability issues while laying the groundwork for advanced capabilities.

## What Changes

- **P0 - Comprehensive Testing & Multi-Space Support**:
  - Implement full unit and integration test coverage for all pipeline components.
  - Remove hardcoded default space indices and use space-aware resolution.
- **P0 - Performance Optimization**:
  - Refactor pipeline execution to use asynchronous processing, bulk Elasticsearch/Cases API operations, and optimized memory batching.
- **P0 - UI Integration Development**:
  - Build monitoring dashboards, configuration management UI, and investigation case workflow UI.
- **P1 - Enhanced Security & Operational Excellence**:
  - Add user-level access controls and input validation.
  - Implement comprehensive Kibana audit logging for pipeline actions.
  - Add pipeline health metrics, monitoring, and automated alerting.
- **P1 - Scalability Improvements**:
  - Implement a worker pool architecture, paginated indexed case matching, and a Redis-backed caching layer for observables.
- **P2 - Advanced Capabilities**:
  - Add threat intelligence integration and MITRE ATT&CK correlation.
  - Introduce automated response orchestration (SOAR, playbook execution).
  - Integrate ML models for anomaly scoring and alert prioritization.

## Capabilities

### New Capabilities
- `pipeline-multi-space`: Support for resolving alert indices and cases dynamically per Kibana space.
- `pipeline-ui`: UI management for pipeline configuration, monitoring, and workflow.
- `pipeline-observability`: Operational metrics, logging, and health alerts.
- `pipeline-advanced-correlation`: Threat intelligence and cross-host temporal correlation.
- `pipeline-response-automation`: Automated SOAR and containment actions.
- `pipeline-ml-integration`: ML-driven behavioral baselines and priority scoring.

### Modified Capabilities
- `alert-investigation-pipeline`: Re-architecting core pipeline to use async worker pools, bulk operations, access controls, audit logs, and rigorous testing validation.

## Impact

- **Code & Architecture**: Massive refactoring of `x-pack/solutions/security/plugins/elastic_assistant/server/lib/attack_discovery/pipeline/*`.
- **APIs**: New internal endpoints for UI configuration and pipeline monitoring. Modifying existing API routes to be space-aware and asynchronous.
- **Dependencies**: Deep integration with Kibana auditing, metrics, task manager (for worker pool/background processing), and ML plugins.
- **Data Model**: Saved objects for configuration and status tracking.
