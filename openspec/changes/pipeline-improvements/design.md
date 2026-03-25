## Context

The Alert-to-Investigation Pipeline is currently a spike implementation operating sequentially in memory. It fetches alerts from `.alerts-security.alerts-default` in the default space, deduplicates them, extracts entities, matches against open cases, and triggers Attack Discovery (AD). To evolve this into a production-ready feature, it must be robust against high alert volumes, multi-space aware, highly secure, fully observable, and support advanced TI/ML capabilities.

## Goals / Non-Goals

**Goals:**
- Provide full test coverage (>80% unit/integration) and robust error handling.
- Enable space-aware index resolution and RBAC/access controls.
- Refactor pipeline execution to use an asynchronous worker pool (Task Manager) and bulk operations.
- Build comprehensive UI components for monitoring and configuration.
- Add advanced capabilities like ML baselining, Threat Intelligence integration, and SOAR orchestration.

**Non-Goals:**
- Completely rewriting the underlying Attack Discovery or LLM mechanisms (we are improving the pipeline *around* AD).
- Modifying the core alerting framework or existing SIEM detection engine.

## Decisions

1. **Async Worker Pool via Task Manager**
   - **Decision:** Shift from a synchronous API route to Kibana Task Manager background tasks.
   - **Rationale:** Prevents request timeouts on large alert batches and provides built-in retry mechanics, rate limiting, and circuit breaking.
   - **Alternative:** Custom in-memory worker pool (rejected due to stateless requirements in Kibana across nodes).

2. **Space-Aware Indexing**
   - **Decision:** Remove hardcoded `.alerts-security.alerts-default`. Dynamically resolve `kibana.alert.workspace_id` and the space-specific tracking index.
   - **Rationale:** Kibana is multi-tenant. Security operations teams work across multiple spaces.

3. **Bulk API for Cases and Observables**
   - **Decision:** Replace individual `casesClient.attachments.add` loop with a newly introduced or optimized bulk API usage, capping batch sizes at a safe limit.
   - **Rationale:** Avoids N+1 Elasticsearch query bottlenecks.

4. **Kibana Audit Logging Integration**
   - **Decision:** Hook into `@kbn/audit-plugin` for logging every case created and alert attached by the pipeline.
   - **Rationale:** Compliance (SOC2) demands traceability of automated actions.

5. **Threat Intel & ML Extensibility**
   - **Decision:** Introduce a pipeline "Enrichment" stage interface.
   - **Rationale:** Allows pluggable modules (TI feed lookups, ML anomaly scoring) to run concurrently before case matching.

## Risks / Trade-offs

- **[Risk] Task Manager Overhead** → Overloading Kibana's internal Task Manager with heavy payload processing.
  *Mitigation:* Use Task Manager just for orchestration/scheduling, but stream data directly from ES using Point-In-Time (PIT) or scrolling to avoid heavy state payloads in the task doc.
- **[Risk] Case Matching Performance** → Full index scan across all cases for entity matching is slow.
  *Mitigation:* Introduce a Redis or ES-backed caching layer (or specialized entity index) to quickly cross-reference observables.
- **[Risk] Scope Creep** → Implementing P0, P1, and P2 all at once is massive.
  *Mitigation:* Phased rollout behind feature flags. We will divide the implementation into modular PRs (Testing/Multi-space first, then Async/Perf, then UI, then TI/ML).
