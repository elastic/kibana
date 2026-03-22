## Why

The Osquery-based Endpoint Compliance spike successfully validated the end-to-end value chain from rule management to dashboard visualization. However, it contains several temporary shortcuts and missing production requirements that prevent deployment to customers. To move from spike to production-ready feature, we need robust data deduplication, real query scheduling, versioned benchmark support, enterprise reporting, and comprehensive test coverage.

## What Changes

- **Real-time data deduplication** via Elasticsearch transforms for findings_latest index
- **Live osquery scheduling** through Fleet pack deployment API integration  
- **CIS benchmark versioning** system supporting multiple versions per platform
- **CSP dashboard integration** for unified posture view across cloud and endpoints
- **Comprehensive test coverage** with Scout API and UI tests for all workflows
- **Custom rule authoring** UI for security teams to create organization-specific rules
- **Exception management** system for suppressing rules per host, rule, or globally
- **Compliance reporting** with PDF/CSV export for regulatory audits

## Capabilities

### New Capabilities
- `findings-deduplication`: Transform-based latest findings index with automated deduplication per host+rule
- `osquery-scheduling`: Real Fleet pack deployment with query scheduling and agent policy management
- `benchmark-versioning`: Multi-version CIS benchmark support with update/migration workflows
- `csp-integration`: Cloud Security Posture dashboard integration for unified endpoint+cloud view
- `rule-authoring`: Custom compliance rule creation UI with osquery query builder and validation
- `exception-management`: Rule suppression system with audit trail and granular scoping
- `compliance-reporting`: PDF/CSV report generation for regulatory compliance and auditing
- `test-coverage`: Comprehensive Scout API and UI test suites covering all compliance workflows

### Modified Capabilities
<!-- No existing capabilities are having their requirements changed - this is additive -->

## Impact

**Affected Code:**
- `server/compliance/services/` - New transform service, pack deployment integration, versioning service
- `server/compliance/routes/` - Additional API routes for reporting, exceptions, rule authoring
- `public/compliance/` - New UI pages for rule creation, exception management, report generation
- `common/compliance/` - Extended types for versioning, exceptions, reporting schemas

**APIs:**
- New internal routes: `/rules/_create`, `/exceptions`, `/reports`, `/benchmarks/versions`
- Fleet API integration for pack deployment and agent policy management
- CSP API integration for dashboard data sharing

**Dependencies:**
- Elasticsearch transforms for findings deduplication
- Fleet Server for real osquery scheduling
- Report generation libraries (PDF/CSV)
- Scout test framework for comprehensive coverage

**Systems:**
- Extended saved object types for exceptions and versioned benchmarks
- New Task Manager jobs for transform monitoring and report generation
- Integration points with Cloud Security Posture plugin