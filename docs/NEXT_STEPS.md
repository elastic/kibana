# Endpoint Compliance - Next Steps for Production

**For**: Next engineer continuing this work
**Current Status**: 65% complete
**Remaining Effort**: 3-4 weeks (1 engineer) or 2 weeks (2 engineers in parallel)
**Updated**: 2026-03-22

---

## Quick Start for New Engineer

**First 30 Minutes**:
1. Read [COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md) - Understand what's done
2. Read [PRODUCTION_READINESS_ASSESSMENT.md](PRODUCTION_READINESS_ASSESSMENT.md) - Understand gaps
3. Review [CODE_INVENTORY.md](CODE_INVENTORY.md) - Understand implementation
4. Scan this document (NEXT_STEPS.md) - Understand your work

**Day 1**:
5. Enable feature flag: `xpack.osquery.enableExperimental: ['endpointComplianceMonitoring']`
6. Run demo setup: `./docs/demo/demo_setup.sh`
7. Run through demo: Follow `docs/demo/DEMO_SCRIPT.md`
8. Run tests: Verify all tests pass (see commands below)

**Week 1**: Focus on deployment infrastructure (highest priority)

---

## Priority Matrix

### 🔴 **Week 1: Deployment Infrastructure (CRITICAL)**

**Goal**: Make it safe to deploy to production

#### Task 1.1: Database Migrations (2 days)

**Purpose**: Handle schema upgrades safely

**Files to Create**:
```
server/migrations/
├── compliance_v1_to_v2.ts
└── rollback_v2_to_v1.ts
```

**Implementation**:
```typescript
// Example migration
export const complianceV1ToV2 = {
  version: '2.0.0',
  up: async (savedObjectsClient) => {
    // Add new fields to existing compliance rules
    const { saved_objects } = await savedObjectsClient.find({
      type: 'osquery-compliance-rule',
      perPage: 10000,
    });

    for (const so of saved_objects) {
      await savedObjectsClient.update(
        'osquery-compliance-rule',
        so.id,
        {
          ...so.attributes,
          schema_version: 2,
          // Add new fields with defaults
        }
      );
    }
  },
  down: async (savedObjectsClient) => {
    // Rollback logic
  },
};
```

**Test**:
```bash
yarn test:jest server/migrations/**/*.test.ts
```

---

#### Task 1.2: Deployment Validation (1 day)

**Purpose**: Pre-flight checks before deployment

**Files to Create**:
```
server/lib/deployment/
├── health_checks.ts
└── pre_deployment_validation.ts
```

**Implementation**:
```typescript
export async function validateDeployment() {
  const checks = [
    checkElasticsearchVersion(), // >= 8.15
    checkTransformEnabled(), // Transforms feature enabled
    checkFleetConfigured(), // Fleet server URL set
    checkLicenseLevel(), // Enterprise license for advanced features
  ];

  const results = await Promise.all(checks);

  return {
    ready: results.every(r => r.passed),
    checks: results,
  };
}
```

---

#### Task 1.3: Monitoring Configuration (1 day)

**Purpose**: Observability in production

**Files to Create**:
```
server/config/
├── monitoring_alerts.json
└── apm_config.ts
```

**Alerts to Configure**:
1. Transform stopped → Email + Slack
2. No findings for 2h → Email
3. Compliance score drops >10% → Email + Slack
4. Pack deployment failed → Email

**Metrics to Track**:
- Transform processing rate
- Finding ingestion rate
- API response times (P50, P95, P99)
- Pack deployment success rate

---

#### Task 1.4: Rollback Procedures (0.5 days)

**Purpose**: Emergency disable mechanism

**Files to Create**:
```
scripts/
├── disable_compliance_emergency.sh
└── rollback_deployment.sh
```

**Implementation**:
```bash
#!/bin/bash
# Emergency disable script

# 1. Stop all pack deployments
# 2. Stop transform
# 3. Disable feature flag
# 4. Notify team
```

---

### 🟡 **Week 2: Feature Completions (HIGH PRIORITY)**

#### Task 2.1: Benchmark Versioning (2 days)

**Missing Features** (from `openspec/changes/endpoint-compliance-production/tasks.md`):
- [ ] 3.3: Version comparison utilities
- [ ] 3.4: Version migration workflows
- [ ] 3.5: Dashboard version filtering
- [ ] 3.6: Version deprecation
- [ ] 3.7: Backward compatibility

**Files to Modify**:
- `server/services/benchmark_version_service.ts` - Add comparison logic
- `server/routes/index.ts` - Add `/benchmarks/versions/compare` endpoint
- `public/compliance/components/benchmark_version_selector.tsx` - Add version filter UI

**Test**:
- Add tests to `server/__tests__/benchmark_version_service.test.ts`
- Add UI test to `test/scout/ui/tests/rules_management.spec.ts`

---

#### Task 2.2: Rule Authoring Workflows (2 days)

**Missing Features**:
- [ ] 4.3: Query validation service
- [ ] 4.4: Query testing sandbox
- [ ] 4.5: Rule template library
- [ ] 4.6: Rule preview/impact assessment

**Implementation Priority**:

**Day 1: Query Validation**
```typescript
// server/services/query_validation_service.ts
export class QueryValidationService {
  async validateQuery(query: string): Promise<ValidationResult> {
    // 1. Parse SQL syntax
    // 2. Verify table names are valid osquery tables
    // 3. Check for dangerous operations (DROP, DELETE, etc.)
    // 4. Estimate query performance
    return { valid: boolean, errors: string[], warnings: string[] };
  }
}
```

**Day 2: Sandbox Testing**
```typescript
// server/services/query_sandbox_service.ts
export class QuerySandboxService {
  async testQuery(query: string, targetAgentId?: string): Promise<QueryTestResult> {
    // Execute query on test agent via osquery_manager
    // Return results + execution time
    return { rows: [], duration_ms: number, success: boolean };
  }
}
```

---

#### Task 2.3: Exception Management Workflows (1 day)

**Missing Features**:
- [ ] 5.3: Approval workflow
- [ ] 5.4: Time-bound expiration handling
- [ ] 5.7: Scoring integration

**Implementation**:
```typescript
// server/services/exception_approval_service.ts
export class ExceptionApprovalService {
  async submitForApproval(exceptionId: string): Promise<ApprovalRequest> {
    // 1. Create approval request
    // 2. Notify approvers (email/Slack)
    // 3. Track approval status
  }

  async approve(approvalId: string, approverId: string): Promise<void> {
    // 1. Mark exception as approved
    // 2. Enable exception
    // 3. Audit log
  }
}
```

---

### 🟢 **Week 3: Advanced Features (MEDIUM PRIORITY)**

#### Task 3.1: CSP Integration (3 days)

**Defer to v1.1 if timeline is tight**

**Missing Features**:
- [ ] 6.3: Unified posture scoring
- [ ] 6.4: Resource correlation (endpoint ↔ cloud)
- [ ] 6.5: Bidirectional alerting

---

#### Task 3.2: Enhanced Reporting (2 days)

**Defer to v1.1 if timeline is tight**

**Missing Features**:
- [ ] 7.3: Regulatory framework templates (SOC2, ISO27001)
- [ ] 7.4: Customizable report scope
- [ ] 7.5: Automated scheduling

---

### 📊 **Week 4: Final Validation & Launch**

#### Task 4.1: Production-Scale Validation (2 days)

**Test Scenarios**:
1. **Load Test**: 1000 hosts, 500 rules, 10,000 findings
2. **Performance**: API response times under load
3. **Transform**: Deduplication at scale
4. **Fleet**: Pack deployment to 100+ agent policies
5. **Reporting**: Generate large PDF (1000+ findings)

**Acceptance Criteria**:
- All API endpoints respond in <5s (P95)
- Transform lag <5 minutes
- Pack deployment success rate >95%
- No memory leaks over 24h continuous operation

---

#### Task 4.2: Security Review (1 day)

**Review Areas**:
1. **Input Validation**: All API endpoints sanitize input
2. **RBAC**: Proper privilege checks on all routes
3. **Audit Logging**: All sensitive operations logged
4. **XSS Prevention**: UI properly escapes user input
5. **SQL Injection**: Osquery queries properly parameterized

---

#### Task 4.3: Production PR (1 day)

**PR Checklist**:
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Demo successful
- [ ] Security review passed
- [ ] Performance benchmarks met
- [ ] Migration scripts tested
- [ ] Rollback procedures documented

---

## Test Execution Commands

### Run All Tests
```bash
# Unit tests (fast - 2 min)
yarn test:jest x-pack/platform/plugins/shared/osquery/server/compliance/__tests__/**/*.test.ts

# Scout UI tests (slow - 10-15 min)
node scripts/scout run-tests \
  --arch stateful \
  --domain classic \
  --config x-pack/platform/plugins/shared/osquery/test/scout/ui/playwright.config.ts

# Scout API tests (medium - 5-8 min)
node scripts/scout run-tests \
  --arch stateful \
  --domain classic \
  --testFiles x-pack/platform/plugins/shared/osquery/test/scout/api/compliance*.spec.ts

# Integration tests (medium - 5 min)
yarn test:jest_integration \
  --config x-pack/platform/plugins/shared/osquery/jest.integration.config.js \
  x-pack/platform/plugins/shared/osquery/server/compliance/__tests__/integration/

# All tests combined: ~25-30 minutes
```

### Run Specific Test Suites
```bash
# Just dashboard UI tests
node scripts/scout run-tests --testFiles test/scout/ui/tests/dashboard.spec.ts

# Just authorization API tests
node scripts/scout run-tests --testFiles test/scout/api/compliance_auth.spec.ts

# Just Fleet integration tests
yarn test:jest_integration server/compliance/__tests__/integration/fleet_integration.test.ts
```

---

## Common Issues & Solutions

### Issue: Scout tests fail with "Feature not found"

**Cause**: Feature flag not enabled

**Fix**:
```bash
# Method 1: Set via advanced settings (UI)
# Stack Management → Advanced Settings → xpack.osquery.enableExperimental → Add "endpointComplianceMonitoring"

# Method 2: Set via kibana.yml
echo "xpack.osquery.enableExperimental: ['endpointComplianceMonitoring']" >> config/kibana.yml
```

---

### Issue: Integration tests fail with "Transform not found"

**Cause**: Transform hasn't been created yet

**Fix**:
```bash
# Start Kibana with feature flag enabled (auto-creates transform)
KIBANA_FEATURE_FLAGS='endpointComplianceMonitoring:true' yarn start

# Wait 30s for plugin initialization
# Transform should now exist: GET /_transform/compliance-findings-latest
```

---

### Issue: API tests fail with 404

**Cause**: Compliance routes not registered (feature flag off)

**Fix**: Enable feature flag (see above)

---

## Task Estimates

| Task | Priority | Effort | Dependencies | Can Defer? |
|------|----------|--------|--------------|------------|
| **Database Migrations** | 🔴 CRITICAL | 2 days | None | ❌ No |
| **Deployment Validation** | 🔴 CRITICAL | 1 day | None | ❌ No |
| **Monitoring Config** | 🔴 CRITICAL | 1 day | None | ⚠️ For MVP, yes |
| **Rollback Procedures** | 🔴 CRITICAL | 0.5 days | None | ❌ No |
| **Benchmark Versioning** | 🟡 HIGH | 2 days | None | ⚠️ Ship with single version |
| **Rule Validation** | 🟡 HIGH | 2 days | None | ⚠️ Ship without sandbox |
| **Exception Workflows** | 🟡 HIGH | 1 day | None | ⚠️ Ship basic exceptions |
| **CSP Integration** | 🟢 MEDIUM | 3 days | CSP team coordination | ✅ Defer to v1.1 |
| **Enhanced Reporting** | 🟢 MEDIUM | 2 days | None | ✅ Defer to v1.1 |
| **Production Validation** | 🔴 CRITICAL | 2 days | All above complete | ❌ No |
| **Security Review** | 🔴 CRITICAL | 1 day | Validation complete | ❌ No |

**Critical Path (MVP)**: Migrations → Validation → Rollback → Production Validation → Security Review = **6.5 days**

**Full v1.0**: Add versioning + rule validation + exception workflows = **+5 days** = **11.5 days total**

---

## Recommended Execution Plan

### **Plan A: MVP in 2 Weeks** (Ship quickly, iterate)

**Week 1: Core Infrastructure**
- Mon-Tue: Database migrations (2 days)
- Wed: Deployment validation (1 day)
- Thu AM: Rollback procedures (0.5 days)
- Thu PM-Fri: Initial production validation (1.5 days)

**Week 2: Validation & Launch**
- Mon-Wed: Fix bugs from validation (3 days)
- Thu: Security review (1 day)
- Fri: Production PR + stakeholder demo (1 day)

**Ships With**:
- ✅ Core compliance monitoring
- ✅ Pre-built CIS benchmarks
- ✅ Basic custom rules (no sandbox testing)
- ✅ Basic exceptions (no approval workflow)
- ❌ Benchmark versioning (defer to v1.1)
- ❌ CSP integration (defer to v1.1)

---

### **Plan B: Full v1.0 in 4 Weeks** (Complete all planned features)

**Week 1: Deployment Infrastructure** (same as Plan A)

**Week 2: Feature Completions**
- Mon-Tue: Benchmark versioning (2 days)
- Wed-Thu: Rule validation + sandbox (2 days)
- Fri: Exception workflows (1 day)

**Week 3: Advanced Features**
- Mon-Wed: CSP integration (3 days)
- Thu-Fri: Enhanced reporting (2 days)

**Week 4: Validation & Launch** (same as Plan A Week 2)

---

### **Plan C: Fast Track with 2 Engineers (2.5 Weeks)**

**Engineer A (Deployment Specialist)**:
- Week 1: Deployment infrastructure (migrations, validation, rollback)
- Week 2: Production validation, security review
- Week 2.5: PR preparation

**Engineer B (Feature Specialist)**:
- Week 1-2: Feature completions (versioning, rule authoring, exceptions)
- Week 2: Advanced features (CSP, reporting)
- Week 2.5: Final testing

**Week 2.5 (Both)**:
- Joint final validation
- Production PR creation
- Stakeholder demo

---

## File Locations Reference

### Where to Add New Code

**Migrations**:
```
server/
└── migrations/
    ├── compliance_v1_to_v2.ts (CREATE)
    └── index.ts (CREATE)
```

**Deployment Validation**:
```
server/
└── lib/
    └── deployment/
        ├── health_checks.ts (CREATE)
        └── validation.ts (CREATE)
```

**Benchmark Versioning** (Enhance existing):
```
server/services/
├── benchmark_version_service.ts (MODIFY - add comparison, migration)
└── versioned_rule_management_service.ts (MODIFY - add filtering)

server/routes/
└── index.ts (MODIFY - add /benchmarks/versions/compare endpoint)

public/compliance/components/
└── benchmark_version_selector.tsx (CREATE)
```

**Rule Validation** (Enhance existing):
```
server/services/
├── query_validation_service.ts (CREATE)
└── query_sandbox_service.ts (CREATE)

public/compliance/pages/
└── rule_authoring_page.tsx (MODIFY - add validation UI)
```

---

## Test File Locations

All tests are organized by type:

```
test/
├── scout/
│   ├── api/
│   │   ├── compliance.spec.ts (existing)
│   │   ├── compliance_auth.spec.ts (NEW)
│   │   └── compliance_workflows.spec.ts (NEW)
│   └── ui/
│       ├── playwright.config.ts (NEW)
│       ├── fixtures/ (NEW)
│       └── tests/ (NEW - 4 test files)
└── server/compliance/__tests__/
    ├── *.test.ts (7 unit tests - existing)
    └── integration/ (NEW - 3 integration tests)
```

**Add new tests to appropriate location**:
- UI behavior → `test/scout/ui/tests/`
- API contracts → `test/scout/api/`
- Service logic → `server/__tests__/`
- System integration → `server/__tests__/integration/`

---

## Documentation Maintenance

### When Code Changes

**If you add/modify an API endpoint**:
1. Update `docs/api/compliance_api_spec.yaml`
2. Update `docs/api/API_REFERENCE.md`
3. Add test to `test/scout/api/`

**If you add/modify a UI feature**:
1. Update `docs/user_guide/USER_GUIDE.md`
2. Add test to `test/scout/ui/tests/`
3. Update demo script if user-visible

**If you change configuration**:
1. Update `docs/user_guide/ADMIN_GUIDE.md`
2. Update deployment validation scripts

---

## Success Criteria for Production

**Must-Have (Blocking)**:
- ✅ Feature flag working (**COMPLETE**)
- ✅ Test coverage ≥80% (**COMPLETE** - have ~80%)
- ✅ Documentation complete (**COMPLETE**)
- ✅ Demo materials ready (**COMPLETE**)
- ❌ **Database migrations** (**TODO** - Week 1)
- ❌ **Deployment validation** (**TODO** - Week 1)
- ❌ **Rollback procedures** (**TODO** - Week 1)
- ⚠️ **Production-scale validation** (**TODO** - Week 2 or 4)
- ⚠️ **Security review** (**TODO** - Week 2 or 4)

**Should-Have (MVP can ship without, add in v1.1)**:
- Benchmark versioning
- Rule sandbox testing
- Exception approval workflows
- CSP integration
- Enhanced reporting

---

## Questions to Answer Before Starting

1. **Scope**: MVP (2 weeks) or Full v1.0 (4 weeks)?
2. **Resources**: 1 engineer or 2 engineers?
3. **Timeline**: Hard deadline or flexible?
4. **Priorities**: Must-have features vs nice-to-have?

**Recommendation**: **Plan A (MVP in 2 weeks)** to get customer feedback early, then iterate to v1.1

---

## Contact for Questions

**Previous Engineer**: Patryk Kopycinski
**Documentation**: All in `docs/` directory
**Code Questions**: Read code inventory + inline comments
**Test Questions**: All tests have descriptive comments

**Slack Channels**:
- #security-solution-dev - General feature questions
- #fleet - Fleet integration questions
- #kibana-core - Transform/deployment questions

---

**Good luck! 🚀 You're building something awesome for Elastic Security.**

---

**Document Version**: 1.0
**Created By**: Claude (spike-builder skill)
**Last Updated**: 2026-03-22
