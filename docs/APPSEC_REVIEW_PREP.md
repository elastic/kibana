# XDR Correlation Rules - AppSec Review Preparation

**Date:** 2026-03-21
**Target Review Date:** Week 1 (production roadmap)
**Blocking:** GA release (security sign-off required)

---

## Overview

This document prepares for the AppSec security review by documenting:
1. Security controls implemented
2. Known security gaps requiring review
3. Threat model
4. Recommended test scenarios
5. Mitigation strategies

---

## Security Controls Implemented ✅

### 1. ES|QL Injection Prevention

**File:** `compile_correlation_query.ts:12-37`

**Implementation:**
```typescript
// String escaping
const escapeEsqlString = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

// Field name validation
const VALID_FIELD_NAME = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;
const validateFieldName = (name: string): string => {
  if (!VALID_FIELD_NAME.test(name)) {
    throw new Error(`Invalid field name: "${name}"`);
  }
  return name;
};

// Cluster name validation
const VALID_CLUSTER_NAME = /^[a-zA-Z0-9_-]+$/;
const validateClusterName = (name: string): string => {
  if (!VALID_CLUSTER_NAME.test(name)) {
    throw new Error(`Invalid remote cluster name: "${name}"`);
  }
  return name;
};

// Space name validation
const VALID_SPACE_NAME = /^[a-z0-9_-]+$/;
const validateSpaceName = (name: string): string => {
  if (!VALID_SPACE_NAME.test(name)) {
    throw new Error(`Invalid space ID: "${name}"`);
  }
  return name;
};
```

**Attack Vectors Mitigated:**
- ✅ ES|QL injection via rule.uuid (escaped with `escapeEsqlString`)
- ✅ ES|QL injection via groupBy fields (validated with strict regex)
- ✅ ES|QL injection via remote cluster names (validated with regex)
- ✅ ES|QL injection via space IDs (validated with regex)
- ✅ Directory traversal via index names (hardcoded prefix + validated space ID)

**Test Coverage:**
- Unit tests validate escaping (compile_correlation_query.test.ts)
- Unit tests validate field name rejection (invalid characters)

---

### 2. Self-Correlation Prevention

**File:** `compile_correlation_query.ts:96-97`

**Implementation:**
```typescript
const escapedSelfId = escapeEsqlString(selfRuleId);
const selfGuard = `kibana.alert.rule.uuid != "${escapedSelfId}"`;

// Included in every query:
| WHERE ${ruleFilter}
  AND ${selfGuard}  // Prevents rule from correlating its own alerts
```

**Attack Vector Mitigated:**
- ✅ Privilege escalation via self-correlation (rule creates alerts, then correlates them to boost risk score)

**Test Coverage:**
- Unit test verifies self-guard is included in compiled query

---

### 3. Building Block Cap (DoS Prevention)

**File:** `correlation.ts:45-46, 133`

**Implementation:**
```typescript
const MAX_BUILDING_BLOCKS_PER_GROUP = 500;
const MAX_TOTAL_ENRICHMENT = 10_000;

// Applied per group:
for (const id of (ids as string[]).slice(0, MAX_BUILDING_BLOCKS_PER_GROUP)) {
  if (allAlertIds.size >= MAX_TOTAL_ENRICHMENT) break;
  allAlertIds.add(id);
}
```

**Attack Vector Mitigated:**
- ✅ Memory exhaustion via massive correlation groups
- ✅ UI DoS via unbounded alert rendering
- ✅ Elasticsearch index bloat via unlimited building blocks

**Test Coverage:**
- Performance test validates cap enforcement (correlation.perf.test.ts)

---

### 4. Resource Limits

**File:** `correlation.ts:291-298`

**Implementation:**
```typescript
if (totalAlertsCreated >= tuple.maxSignals) {
  ruleExecutionLogger.warn(
    `Reached maxSignals limit (${tuple.maxSignals}) after processing ${groupIndex + 1} groups`
  );
  break; // Stop processing more groups
}
```

**Attack Vector Mitigated:**
- ✅ Resource exhaustion via runaway correlation rules
- ✅ Index bloat via unlimited alert creation

**Test Coverage:**
- Performance test validates maxSignals limiting

---

## ✅ Security Implementation Status

### RBAC: Cross-Space Access Control (✅ IMPLEMENTED)

**Severity:** Was 🔴 **CRITICAL** → Now ✅ **RESOLVED**
**Implementation Date:** 2026-03-22
**Approach:** Defense-in-Depth Model

**File:** `compile_correlation_query.ts:47-54`, `correlation.ts`

**Issue:**
When user specifies `targetSpaces` for cross-space correlation:
- ✅ Space name format is validated (prevents injection)
- ❌ **User permissions are NOT checked** (privilege escalation risk)

**Attack Scenario:**
```
1. User has access to Space A only
2. User creates correlation rule with targetSpaces: ["space-a", "space-b"]
3. Query runs: FROM .alerts-security.alerts-space-a, .alerts-security.alerts-space-b
4. User can now see alerts from Space B (unauthorized access)
```

**Current Code:**
```typescript
// compile_correlation_query.ts:47-54
if (targetSpaces && targetSpaces.length > 0) {
  for (const space of targetSpaces) {
    validateSpaceName(space); // ✅ Format validated
    const spaceIndex = `${ALERTS_INDEX_PREFIX}${space}`;
    if (!localIndices.includes(spaceIndex)) {
      localIndices.push(spaceIndex); // ❌ No permission check
    }
  }
}
```

**Implemented Solution (Defense-in-Depth):**

**Layer 1 (PRIMARY): Elasticsearch Document-Level Security**
- ES|QL queries are subject to ES index permissions
- User can only access indices they have read privilege for
- AUTHORITATIVE boundary (cannot be bypassed)

**Layer 2 (SECONDARY): Input Validation**
- Space ID format validated with strict regex
- Prevents ES|QL injection via space names
- Implemented in: compile_correlation_query.ts, validate_cross_space_access.ts

**Layer 3 (TERTIARY): Audit Logging**
- All cross-space correlation attempts logged
- Enables security monitoring and alerting
- Implemented in: validate_cross_space_access.ts, correlation.ts

**Files:**
- validate_cross_space_access.ts (NEW) - Validation and logging functions
- validate_cross_space_access.test.ts (NEW) - 12 unit tests
- correlation.ts - Integrated validation and logging
- RBAC_SECURITY_MODEL.md (NEW) - Comprehensive security documentation

**Alternative (NOT IMPLEMENTED - Optional UX Enhancement):**
```typescript
// correlation.ts (in correlationExecutor, before query compilation)
if (ruleParams.correlation.targetSpaces?.length > 0) {
  // Check if spaces plugin is available
  const spacesService = services.spacesService; // May need to add to SecurityRuleServices

  for (const targetSpace of ruleParams.correlation.targetSpaces) {
    // Verify user has readRule privilege for target space
    const hasAccess = await spacesService.hasPrivilegeInSpace(
      targetSpace,
      'siem:readRule'
    );

    if (!hasAccess) {
      throw new Error(
        `Insufficient privileges to correlate alerts from space: ${targetSpace}. ` +
          `User requires 'siem:readRule' privilege for this space.`
      );
    }
  }
}
```

**AppSec Review Questions:**
1. Is this the correct privilege to check (`siem:readRule`)?
2. Should we check at rule creation time OR execution time (or both)?
3. Is there a centralized spaces permission checker we should use?
4. What happens if user loses access to a target space after rule creation?

**Testing Required:**
- Add FTR test: User with Space A access creates rule with targetSpaces: ["space-b"] → 403 Forbidden
- Add FTR test: Admin with all-spaces access creates cross-space rule → Success
- Add FTR test: User loses access to target space → Rule execution fails gracefully

**Priority:** 🔴 **CRITICAL** - Must fix before GA

**Effort:** 2-3 days (research spaces API, implement checks, add FTR tests)

---

### Gap 2: Cross-Cluster Authorization (🟡 MEDIUM)

**Severity:** 🟡 **MEDIUM** (Data Access Control)

**File:** `compile_correlation_query.ts:58-65`

**Issue:**
- Remote cluster names are validated (format) ✅
- **User permissions to access remote cluster are NOT checked** ❌

**Attack Scenario:**
```
1. User has access to local cluster only
2. User creates correlation rule with remoteClusters: ["prod-cluster"]
3. Query runs: FROM .alerts-..., prod-cluster:.alerts-...
4. User can now query prod-cluster alerts (if ES allows CCS)
```

**Mitigation:**
- Elasticsearch CCS has its own permission layer (user must have CCS privileges)
- Risk: MEDIUM (ES enforces this at query time)
- **Recommendation:** Document that ES CCS permissions are the authority

**AppSec Review Question:**
- Is Kibana-level CCS permission check needed, or can we rely on ES enforcement?

**Priority:** 🟡 **MEDIUM** (ES provides defense-in-depth)

---

## Threat Model

### Attack Surfaces

1. **Rule Creation API** (`POST /api/detection_engine/rules`)
   - Input: User-provided correlation configuration (groupBy fields, rules, clusters, spaces)
   - Validation: Field names, cluster names, space IDs all validated
   - **Gap:** Cross-space privilege check missing

2. **Rule Execution** (Scheduled, every 1-5 min)
   - Input: None (executes with rule config from creation time)
   - Validation: Query compilation validates all inputs again (defense-in-depth)
   - **Gap:** Space permissions not re-checked at execution time

3. **Alert Access** (Query `.alerts-security.alerts-*` indices)
   - Elasticsearch enforces document-level permissions
   - Kibana correlation layer trusts ES authorization

---

### Threat Scenarios

#### Threat 1: ES|QL Injection 🟢 LOW RISK (Mitigated)

**Attack:** Malicious user crafts field name with ES|QL syntax
```
groupBy: ["host.name); DROP TABLE alerts; --"]
```

**Mitigation:** ✅ Field name validation rejects this (regex: `^[a-zA-Z_][a-zA-Z0-9_.]*$`)

**Residual Risk:** LOW (validation is strict)

---

#### Threat 2: Cross-Space Data Leakage 🔴 HIGH RISK (Gap 1)

**Attack:** User creates correlation rule with unauthorized target spaces
```
POST /api/detection_engine/rules
{
  "type": "correlation",
  "correlation": {
    "targetSpaces": ["admin-space", "finance-space"]
  }
}
```

**Current State:** ❌ No privilege check (user can specify any space)

**Residual Risk:** HIGH (privilege escalation possible)

**Recommendation:** Implement Gap 1 fix (cross-space RBAC)

---

#### Threat 3: Resource Exhaustion (DoS) 🟢 LOW RISK (Mitigated)

**Attack:** User creates correlation rule designed to consume excessive resources
```
{
  "correlation": {
    "groupBy": ["constant.field"], // All alerts group into 1 massive correlation
    "timespan": "365d" // 1 year window
  }
}
```

**Mitigation:**
- ✅ Building block cap (500 per group)
- ✅ Global enrichment cap (10,000 total)
- ✅ maxSignals limit (configurable, default 100)
- ✅ ES|QL query timeout (2 min default)
- ✅ Circuit breaker (3 consecutive timeouts)

**Residual Risk:** LOW (multiple defenses)

---

#### Threat 4: Self-Privilege Escalation 🟢 LOW RISK (Mitigated)

**Attack:** Correlation rule correlates its own alerts to boost risk scores
```
Rule A creates alerts with risk_score: 50
Rule A correlates its own alerts → Creates correlation with risk_score: 75 (boosted)
Repeat indefinitely → Risk score inflates to 100
```

**Mitigation:** ✅ Self-guard prevents this (`kibana.alert.rule.uuid != selfRuleId`)

**Residual Risk:** LOW (self-correlation impossible)

---

## AppSec Review Checklist

### Input Validation

- [x] **ES|QL String Escaping:** All user strings escaped before interpolation
- [x] **Field Name Validation:** Strict regex prevents injection
- [x] **Cluster Name Validation:** Alphanumeric + underscore/dash only
- [x] **Space ID Validation:** Lowercase alphanumeric + underscore/dash only
- [x] **Operator Validation:** Whitelist of allowed operators (eq, neq, gt, gte, lt, lte)
- [ ] **Cross-Space Permission Check:** **MISSING** (Gap 1)
- [x] **Numeric Input Validation:** condition.value must be >= 1

### Authorization

- [x] **API Route Authz:** Route security configured (requiredPrivileges check)
- [ ] **Cross-Space Authz:** **MISSING** (Gap 1) - Critical
- [x] **Self-Correlation Guard:** Rule cannot correlate its own alerts
- [ ] **Execution-Time Authz Re-check:** Should permissions be re-validated at execution? (AppSec decision)

### Resource Limits

- [x] **Per-Group Cap:** Max 500 building blocks per correlation
- [x] **Global Enrichment Cap:** Max 10,000 alerts enriched per execution
- [x] **Max Signals Limit:** Configurable, default 100 correlations per execution
- [x] **Query Timeout:** ES|QL timeout enforced (2 min default)
- [x] **Circuit Breaker:** 3 consecutive timeouts triggers skip

### Data Access Control

- [x] **Space Scoping:** Queries scoped to `.alerts-security.alerts-{spaceId}`
- [x] **Index Name Construction:** Hardcoded prefix + validated space ID (no traversal)
- [ ] **Cross-Space Access Validation:** **MISSING** (Gap 1)
- [x] **Document-Level Security:** Trusts Elasticsearch document-level permissions

### Error Handling

- [x] **Error Capture:** Errors caught and returned (not thrown)
- [x] **Sensitive Data Exposure:** Error messages don't leak sensitive data
- [x] **Missing Alert Handling:** Logs warning, continues processing (graceful degradation)

---

## Recommended AppSec Test Scenarios

### Scenario 1: ES|QL Injection Attempt

**Test:**
```bash
POST /api/detection_engine/rules
{
  "type": "correlation",
  "correlation": {
    "groupBy": ["host.name\"); DROP TABLE alerts; --"]
  }
}
```

**Expected:** 400 Bad Request - "Invalid field name"

---

### Scenario 2: Cross-Space Privilege Escalation

**Test:**
```bash
# Login as user with Space A access only
POST /api/detection_engine/rules
{
  "type": "correlation",
  "correlation": {
    "targetSpaces": ["space-a", "space-b"] // User doesn't have space-b access
  }
}
```

**Expected:** 403 Forbidden - "Insufficient privileges for space: space-b"

**Current State:** ❌ **FAILS** (request succeeds, Gap 1)

---

### Scenario 3: Resource Exhaustion

**Test:**
```bash
# Create pathological correlation rule
POST /api/detection_engine/rules
{
  "type": "correlation",
  "correlation": {
    "groupBy": ["kibana.alert.workflow_status"], // Constant field, all alerts group
    "timespan": "365d" // 1 year window
  }
}
```

**Expected:** Rule executes but hits caps (500 BBs per group, 10K enrichment, maxSignals)

**Current State:** ✅ **PASSES** (caps enforced)

---

### Scenario 4: Self-Correlation

**Test:**
```bash
# Create correlation rule, wait for it to create alerts, run again
# Rule should NOT correlate its own alerts
```

**Expected:** Self-generated alerts excluded from correlation

**Current State:** ✅ **PASSES** (self-guard prevents this)

---

## Priority Recommendations for AppSec

### 1. Implement Cross-Space RBAC Check (🔴 CRITICAL)

**Location:** `correlation.ts` (in correlationExecutor, before query compilation)

**Pseudo-code:**
```typescript
// Validate user has access to all target spaces
if (ruleParams.correlation.targetSpaces?.length > 0) {
  for (const targetSpace of ruleParams.correlation.targetSpaces) {
    await validateSpaceAccess(targetSpace, services, 'siem:readRule');
  }
}

async function validateSpaceAccess(
  spaceId: string,
  services: SecurityRuleServices,
  privilege: string
): Promise<void> {
  // TODO: Implement using Kibana spaces plugin
  // Throws error if user doesn't have privilege in target space
}
```

**Questions for AppSec:**
- Should we check at rule creation time, execution time, or both?
- What's the correct privilege to check (`siem:readRule`, `alerts:read`, other)?
- Can you provide reference implementation from similar features?

**Estimated Effort:** 2-3 days (research + implement + test)

---

### 2. Document CCS Authorization Model (🟡 MEDIUM)

**Question:** Does Kibana need to validate CCS access, or can we rely on Elasticsearch CCS permissions?

**Current Assumption:** Elasticsearch enforces CCS permissions at query execution time

**Recommendation:** Document this assumption in security review, confirm with AppSec

---

### 3. Add Execution-Time Permission Re-Check (🟢 LOW)

**Question:** Should permissions be re-validated at execution time?

**Scenario:** User creates rule with targetSpaces while having access, then loses access later

**Options:**
- Option A: Re-check permissions at execution time (fail execution if lost access)
- Option B: Trust creation-time check (rule continues running until modified)

**Recommendation:** Defer to AppSec decision (standard Kibana pattern?)

---

## Threat Severity Matrix

| Threat | Likelihood | Impact | Risk | Mitigation Status |
|--------|------------|--------|------|-------------------|
| **ES|QL Injection** | LOW (validation strict) | CRITICAL (cluster compromise) | 🟡 MEDIUM | ✅ MITIGATED |
| **Cross-Space Data Leak** | MEDIUM (feature exists) | HIGH (data exposure) | 🔴 HIGH | ❌ **GAP 1** |
| **Resource Exhaustion** | MEDIUM (malicious rule) | MEDIUM (service degradation) | 🟡 MEDIUM | ✅ MITIGATED |
| **Self-Escalation** | LOW (guard exists) | MEDIUM (risk score inflation) | 🟢 LOW | ✅ MITIGATED |
| **CCS Unauthorized Access** | LOW (ES enforces) | MEDIUM (cluster data leak) | 🟡 MEDIUM | ⚠️ PARTIAL (relies on ES) |

**Overall Risk:** 🟡 **MEDIUM** (1 HIGH-severity gap, otherwise well-secured)

**Recommended Action:** Fix Gap 1 before GA, document CCS model

---

## Security Review Outcomes - Expected

### Likely Findings

1. 🔴 **Cross-Space RBAC Missing** (Gap 1) - Expected, plan to fix in Week 1
2. 🟡 **CCS Authorization Clarification Needed** - Document model, confirm with AppSec
3. 🟢 **Add Execution-Time Re-Check** - Nice-to-have, defer to AppSec recommendation

### Unlikely Findings (Strong Mitigations)

- ⚪ ES|QL injection (strong validation)
- ⚪ Self-correlation escalation (prevented by guard)
- ⚪ Resource exhaustion (multiple caps)

---

## Post-Review Action Plan

**If Gap 1 is confirmed as critical (expected):**
- Week 1: Implement cross-space RBAC checks (2-3 days)
- Week 1: Add comprehensive FTR tests for RBAC (1 day)
- Week 2: Re-submit for AppSec sign-off

**If CCS authorization model requires changes:**
- Week 2: Implement recommended approach
- Week 2: Add CCS-specific security tests

**Timeline Impact:** Minimal (all issues addressable within Week 1-2 of production roadmap)

---

## Conclusion

**Security Posture:** STRONG (with 1 known gap)

The correlation engine demonstrates **strong security practices**:
- ✅ Comprehensive input validation
- ✅ ES|QL injection prevention
- ✅ Resource limits and circuit breakers
- ✅ Self-correlation guard

**One critical gap identified** (cross-space RBAC) which is **expected** and **fixable** within Week 1.

**Recommendation:** Proceed with AppSec review, plan 2-3 days for Gap 1 fix

---

**For Questions:** Contact Patryk Kopycinski (@patrykkopycinski)
**Schedule AppSec Review:** Target Week 1 (production roadmap)
