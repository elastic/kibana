## Context

The Osquery-based Endpoint Compliance spike successfully validated the end-to-end value chain but contains temporary shortcuts that prevent production deployment. The current implementation queries raw data streams instead of deduplicated latest findings, has no real osquery scheduling (pack deployment is stubbed), lacks version management for CIS benchmarks, has no integration with CSP, no custom rule authoring UI, no exception management, and minimal test coverage.

The system currently serves ~30 prebuilt CIS rules across 3 platforms (macOS, Windows, Linux) with a React dashboard, findings explorer, and rules management interface. Data flows from osquery results → finding evaluation → score aggregation → dashboard visualization. All components use internal-only APIs with RBAC authorization.

**Current Architecture:**
- **Server**: 6 services, 12 API routes, saved object types, index management
- **Client**: React Query hooks, 3 main pages, reusable components  
- **Data**: Raw findings stream, scores stream (no deduplication transform)

## Goals / Non-Goals

**Goals:**
- Transform spike into production-ready feature suitable for customer deployment
- Implement real osquery scheduling through Fleet pack deployment
- Add comprehensive test coverage (Scout API + UI tests)
- Enable custom rule authoring for organization-specific compliance needs
- Provide enterprise reporting (PDF/CSV) for regulatory compliance
- Integrate with Cloud Security Posture for unified dashboard
- Support CIS benchmark versioning and migration workflows
- Add granular exception management with audit trails

**Non-Goals:**
- Rewrite existing spike components that work correctly
- Change the core data model or API surface (maintain backward compatibility)
- Support non-osquery query engines (e.g., PowerShell DSC, Bash scripts)
- Implement real-time alerting (use existing Security Solution detection rules)
- Build custom PDF rendering engine (use existing Kibana reporting)

## Decisions

### D1: Transform-based Findings Deduplication
**Decision:** Use Elasticsearch continuous transforms to maintain `findings_latest` index
**Rationale:** 
- Transforms handle deduplication at database layer (more efficient than application logic)
- Provides real-time latest findings without complex query logic in services
- Leverages existing Kibana transform management infrastructure
- Allows gradual migration from raw data stream queries

**Alternatives considered:**
- Application-layer deduplication: More complex, less efficient
- View-based deduplication: Query-time overhead, less performant

### D2: Fleet Integration Architecture  
**Decision:** Direct Fleet API integration with pack deployment service
**Rationale:**
- Fleet already manages osquery packs and agent policies 
- Existing Fleet APIs provide all necessary pack lifecycle operations
- Maintains separation of concerns (Fleet handles deployment, compliance handles logic)
- Enables real osquery execution on managed endpoints

**Alternatives considered:**
- Custom agent communication: Duplicates Fleet functionality
- Database-only pack storage: Doesn't actually deploy queries

### D3: Benchmark Versioning Strategy
**Decision:** Semantic versioning with version-qualified saved object IDs and metadata
**Rationale:**
- Semantic versioning (major.minor.patch) aligns with CIS benchmark release patterns
- Version-qualified IDs prevent conflicts between benchmark versions
- Enables side-by-side version comparison and migration workflows
- Maintains backward compatibility with existing single-version data

**Schema:** `{benchmarkId}-v{major.minor.patch}` (e.g., `cis-macos-v15.0.0`)

### D4: CSP Integration Approach
**Decision:** Schema alignment with bidirectional API integration
**Rationale:**
- Aligning data schemas enables seamless dashboard integration
- Bidirectional APIs allow both systems to share context
- Preserves plugin boundaries while enabling unified user experience
- Leverages existing CSP dashboard infrastructure

**Integration points:**
- Shared finding schema and resource identification
- Cross-platform score aggregation APIs
- Unified incident response context sharing

### D5: Custom Rule Authoring Implementation
**Decision:** React-based wizard with osquery query builder and sandbox testing
**Rationale:**
- Wizard approach reduces complexity for non-technical users
- Query builder with templates accelerates rule creation
- Sandbox testing prevents production impact during rule development
- Integrates with existing rule management infrastructure

**Components:** Multi-step wizard, syntax-highlighted editor, query templates, validation engine

### D6: Exception Management Design
**Decision:** Hierarchical suppression with audit trail and time-bound capabilities
**Rationale:**
- Hierarchical scoping (global > benchmark > rule > host) provides flexibility
- Audit trails meet governance and compliance requirements
- Time-bound exceptions prevent permanent security gaps
- Approval workflows support organizational policies

**Scoping hierarchy:** Global → Benchmark → Rule → Host (most to least restrictive)

### D7: Reporting Architecture
**Decision:** Leverage existing Kibana reporting with compliance-specific templates
**Rationale:**
- Existing reporting infrastructure handles PDF generation, scheduling, delivery
- Compliance-specific templates provide regulatory framework alignment
- Maintains consistency with other Kibana reporting features
- Reduces implementation complexity and maintenance burden

### D8: Test Strategy
**Decision:** Scout-based comprehensive test suite with CI integration
**Rationale:**
- Scout is Kibana's strategic testing framework (Playwright-based)
- API + UI test coverage ensures end-to-end functionality
- CI integration prevents regressions
- Performance testing validates scalability claims

## Risks / Trade-offs

### R1: Transform Performance Impact
**Risk:** Continuous transforms may impact Elasticsearch performance on large datasets
**Mitigation:** 
- Implement transform throttling and resource limits
- Monitor transform performance and add alerting
- Provide configuration options for transform frequency
- Document scaling guidelines for large deployments

### R2: Fleet API Dependency
**Risk:** Fleet API changes could break pack deployment functionality
**Mitigation:**
- Use stable Fleet APIs with explicit version pinning
- Implement Fleet API health checks and fallback behaviors
- Add integration tests covering Fleet API interactions
- Monitor Fleet API changes in Kibana development

### R3: Schema Migration Complexity
**Risk:** Benchmark versioning introduces data migration complexity
**Mitigation:**
- Implement backward-compatible schema changes
- Provide migration utilities for existing data
- Support gradual migration with version coexistence
- Document migration procedures thoroughly

### R4: CSP Integration Coupling
**Risk:** Tight coupling with CSP could create maintenance burden
**Mitigation:**
- Design integration APIs with clear boundaries
- Implement feature flags to enable/disable CSP integration
- Add CSP integration health checks and graceful degradation
- Maintain documentation of integration contracts

### R5: Custom Rule Security
**Risk:** User-authored osquery queries could impact system performance or security
**Mitigation:**
- Implement query validation and resource limits
- Provide sandbox testing environment for rule development
- Add query performance monitoring and alerting
- Document security best practices for custom rules

### R6: Exception Management Governance
**Risk:** Widespread exception usage could undermine compliance effectiveness
**Mitigation:**
- Implement approval workflows for sensitive exceptions
- Provide exception impact reporting and trend analysis
- Add automated exception review and expiration processes
- Document exception governance best practices

## Migration Plan

### Phase 1: Infrastructure (Week 1-2)
1. Deploy transform for findings_latest with monitoring
2. Implement Fleet pack deployment service with error handling
3. Add benchmark versioning support to existing saved objects
4. Update scoring service to use deduplicated findings

### Phase 2: Core Features (Week 3-4)
1. Build custom rule authoring UI with wizard workflow
2. Implement exception management with audit trails
3. Add CSP integration APIs and schema alignment
4. Deploy reporting templates and generation workflows

### Phase 3: Testing & Polish (Week 5-6)
1. Complete Scout API and UI test suite implementation
2. Add performance testing and monitoring
3. Documentation and deployment guide updates
4. End-to-end validation with customer scenarios

### Rollback Strategy
- Feature flags enable selective rollback of individual capabilities
- Database migrations are backward-compatible
- Transform deployment can be reverted to raw data stream queries
- Fleet integration failures fall back to existing stub implementation

## Open Questions

1. **CSP Integration Scope**: Should endpoint compliance findings appear in CSP dashboards immediately, or require CSP team coordination?
   - **Decision needed by:** Week 1
   - **Impact:** Integration API design and testing approach

2. **Custom Rule Validation**: What level of query validation is needed beyond syntax checking?
   - **Decision needed by:** Week 2  
   - **Impact:** Rule authoring UI complexity and security posture

3. **Exception Approval Workflow**: Should approval workflows be built-in or integrate with external systems?
   - **Decision needed by:** Week 3
   - **Impact:** Exception management implementation approach

4. **Reporting Integration**: Should we build compliance-specific reporting or extend existing Kibana reporting?
   - **Decision needed by:** Week 3
   - **Impact:** Implementation timeline and maintenance burden

5. **Performance Baseline**: What performance benchmarks should guide transform and query optimization?
   - **Decision needed by:** Week 1
   - **Impact:** Infrastructure sizing and monitoring approach