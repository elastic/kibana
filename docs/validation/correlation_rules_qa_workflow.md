# XDR Correlation Rules - Manual QA Validation Workflow

**Purpose:** Comprehensive manual testing to validate spike quality before stakeholder demos
**Duration:** 45-60 minutes
**Tester:** QA engineer, developer, or team lead

---

## Prerequisites

- [ ] Kibana running locally (http://localhost:5601)
- [ ] Elasticsearch running (http://localhost:9200)
- [ ] Feature flag enabled: `xpack.securitySolution.enableExperimental: ['correlationRulesEnabled']`
- [ ] At least 20-30 security alerts in Elasticsearch (for realistic correlation testing)

**Quick Setup:**
```bash
./docs/demo/correlation_rules_demo_setup.sh
```

---

## Validation Steps

### Step 1: Feature Flag Controls Visibility ✓

**Goal:** Verify feature flag properly enables/disables correlation rule type

**Actions:**

1. Navigate to: **Security → Rules → Create new rule**
2. Verify: **Correlation** tile is visible in rule type selection
3. Close rule creation wizard
4. Navigate to: **Stack Management → Advanced Settings**
5. Search for: `correlationRulesEnabled`
6. Verify current value: `true`
7. Set value to: `false`
8. Click: **Save**
9. Hard refresh browser: `Cmd+Shift+R` (Mac) or `Ctrl+F5` (Windows)
10. Navigate to: **Security → Rules → Create new rule**
11. Verify: **Correlation** tile is **NOT visible**
12. Re-enable: Set `correlationRulesEnabled = true` via Advanced Settings
13. Hard refresh browser
14. Verify: **Correlation** tile is visible again

**Expected:**
- Correlation rule type visibility follows experimental flag state
- Hard refresh required for change to take effect
- No errors in browser console

**Status:** ☐ Pass / ☐ Fail

**Issues Found:** _____________________________

---

### Step 2: Temporal Correlation Rule - Happy Path ✓

**Goal:** Create and execute a temporal correlation rule successfully

**Actions:**

1. Navigate to: **Security → Rules → Create new rule**
2. Click: **Correlation** tile
3. Fill **Define Rule** form:
   - **Name:** `QA Test - Lateral Movement`
   - **Description:** `Detects lateral movement by correlating alerts from same user`
   - **Severity:** `High`
   - **Risk Score:** `70`
4. Fill **Correlation Configuration:**
   - **Correlation Type:** `Temporal`
   - **Group By:** Enter `user.name`
   - **Time Window:** `1h`
   - **Event Count Threshold:** `3` (low threshold for testing)
5. Click: **Preview** (optional)
   - Verify: ES|QL query shown
   - Verify: No syntax errors
6. Configure **Schedule:**
   - **Interval:** `5m` (every 5 minutes)
7. Click: **Create & Enable**
8. Verify: Rule appears in Rules Management with status **Enabled**
9. Wait for next execution (up to 5 minutes), or trigger manually
10. Navigate to: **Security → Alerts**
11. Filter: `kibana.alert.rule.name: "QA Test - Lateral Movement"`
12. Verify: Correlation alert(s) created (if sufficient alerts matched)
13. Expand correlation alert
14. Verify:
    - Shell alert shows summary (e.g., "matched 5 alerts grouped by user.name")
    - Building blocks list visible with links to contributing alerts
    - Risk score is calculated (higher than individual alerts)
    - Grouped by value shown (e.g., user.name: "alice")

**Expected:**
- Rule creation succeeds
- Rule executes without errors
- Correlation alerts created (if threshold met)
- UI correctly displays correlation structure

**Status:** ☐ Pass / ☐ Fail

**Issues Found:** _____________________________

---

### Step 3: Event Count Correlation - Threshold Behavior ✓

**Goal:** Verify event count threshold is respected

**Actions:**

1. Create new correlation rule:
   - **Name:** `QA Test - Brute Force`
   - **Type:** `Event Count`
   - **Group By:** `source.ip`
   - **Time Window:** `5m`
   - **Event Count Threshold:** `10`
2. Wait for execution
3. Navigate to: **Security → Alerts**
4. Verify: Correlation created **only if** ≥10 alerts from same source.ip

**Expected:**
- Threshold is properly enforced
- Groups with <10 alerts do NOT create correlations

**Status:** ☐ Pass / ☐ Fail

**Issues Found:** _____________________________

---

### Step 4: Value Count Correlation - Cardinality Check ✓

**Goal:** Verify value count correlation works (unique values threshold)

**Actions:**

1. Create new correlation rule:
   - **Name:** `QA Test - Port Scan`
   - **Type:** `Value Count`
   - **Group By:** `source.ip`
   - **Count Unique Values Of:** `destination.ip`
   - **Time Window:** `10m`
   - **Unique Value Threshold:** `5`
2. Wait for execution
3. Verify: Correlation created only if source.ip scanned ≥5 unique destination.ip

**Expected:**
- Cardinality threshold enforced
- Correlation shows unique value count in summary

**Status:** ☐ Pass / ☐ Fail

**Issues Found:** _____________________________

---

### Step 5: Temporal Ordered - Sequence Enforcement ✓

**Goal:** Verify temporal ordered correlation enforces chronological ordering

**Actions:**

1. Create new correlation rule:
   - **Name:** `QA Test - Kill Chain`
   - **Type:** `Temporal Ordered`
   - **Group By:** `host.name`
   - **Ordered By:** `kibana.alert.rule.name` (or severity progression)
   - **Time Window:** `2h`
   - **Event Count Threshold:** `3`
2. Wait for execution
3. Verify: Correlation created only for hosts with alerts in chronological order

**Expected:**
- Out-of-order alerts do NOT create correlations (or create separate correlations)
- Ordering is enforced by @timestamp

**Status:** ☐ Pass / ☐ Fail

**Issues Found:** _____________________________

---

### Step 6: AI-Powered Correlation Type Recommendation ✓

**Goal:** Verify type recommendation works based on query analysis

**Actions:**

1. Navigate to: **Security → Rules → Create new rule → Correlation**
2. In **Correlation Type** field, observe **Recommendation** badge/button (if present)
3. Click: **Get Recommendation**
4. Provide sample query or description
5. Verify: System recommends appropriate correlation type with reasoning

**Expected:**
- Recommendation is contextual and helpful
- Reasoning is clear (explains why this type is suggested)

**Status:** ☐ Pass / ☐ Fail / ☐ N/A (if feature not implemented)

**Issues Found:** _____________________________

---

### Step 7: Error Handling - Invalid Group By Field ✓

**Goal:** Verify validation errors for invalid configuration

**Actions:**

1. Create new correlation rule
2. **Group By:** Enter invalid field name: `invalid.field.name`
3. Try to save rule
4. Verify: Error message shown (e.g., "Field does not exist in alert schema")

**Expected:**
- Clear validation error before rule creation
- Error message is actionable
- Form state preserved (can correct and retry)

**Status:** ☐ Pass / ☐ Fail

**Issues Found:** _____________________________

---

### Step 8: Error Handling - Empty Group By ✓

**Goal:** Verify required field validation

**Actions:**

1. Create new correlation rule
2. Leave **Group By** field empty
3. Try to save rule
4. Verify: Error message "Group By field is required"

**Expected:**
- Required field validation works
- Clear error message
- Cannot create rule without required fields

**Status:** ☐ Pass / ☐ Fail

**Issues Found:** _____________________________

---

### Step 9: Rule Execution Performance Check ✓

**Goal:** Verify rule execution completes in reasonable time

**Actions:**

1. Create correlation rule with **5m interval**
2. Navigate to: **Security → Rules → Rule Details** for created rule
3. Wait for next execution
4. Observe **Last Response** section:
   - Execution duration
   - Success/failure status
   - Alerts created count
5. Verify: Execution duration <30s (for typical alert volume)

**Expected:**
- Rule executes within timeout
- Execution duration reasonable
- No timeout errors

**Status:** ☐ Pass / ☐ Fail

**Issues Found:** _____________________________

---

### Step 10: Building Block Alerts Linked to Shell ✓

**Goal:** Verify building block alerts properly link to shell alert

**Actions:**

1. Navigate to: **Security → Alerts**
2. Filter: `kibana.alert.rule.type: correlation`
3. Expand a correlation alert
4. Observe building blocks section
5. Click on a building block alert
6. Verify: Building block has field `kibana.alert.group.id` matching shell alert ID
7. Verify: Building block has field `kibana.alert.building_block.type: default`

**Expected:**
- Building blocks have `group.id` pointing to shell
- Building blocks have `building_block.type` set
- Clicking building block navigates to original alert

**Status:** ☐ Pass / ☐ Fail

**Issues Found:** _____________________________

---

### Step 11: Risk Score Boost for Temporal Rules ✓

**Goal:** Verify temporal correlations have boosted risk scores

**Actions:**

1. Find a temporal correlation alert
2. Observe: **Risk Score** value (e.g., 85)
3. Expand building blocks
4. Observe: Individual alert risk scores (e.g., 70, 65, 75)
5. Calculate expected boost:
   - Max risk from contributing alerts: 75
   - Alert count: 5
   - Boost: min(5, 5) × 0.10 = 0.50 (50%)
   - Expected: 75 × 1.5 = 112.5 → capped at 100
6. Verify: Composite risk score is boosted correctly

**Expected:**
- Temporal correlations have risk score ≥ max contributing alert risk
- Boost is applied (up to +50%)
- Capped at 100

**Status:** ☐ Pass / ☐ Fail

**Issues Found:** _____________________________

---

### Step 12: Console Errors Check ✓

**Goal:** Verify no JavaScript errors or warnings

**Actions:**

1. Open browser DevTools: Console tab
2. Clear console
3. Navigate to: **Security → Rules → Create new rule → Correlation**
4. Fill all form fields
5. Click: **Preview** (if available)
6. Click: **Create & Enable**
7. Review console
8. Verify: No errors (red) or warnings (yellow)

**Expected:**
- Zero console errors
- Zero React warnings
- Zero unhandled promise rejections

**Status:** ☐ Pass / ☐ Fail

**Errors Found:** _____________________________

---

### Step 13: Cross-Space Correlation (if multi-space support exists) ✓

**Goal:** Verify correlation can group alerts across multiple Kibana spaces

**Actions:**

1. Create alerts in Space A and Space B (requires multi-space setup)
2. Create correlation rule with **Target Spaces:** `[Space A, Space B]`
3. Verify: Correlation groups alerts from both spaces

**Expected:**
- Cross-space correlation works
- Permissions respected (user must have access to both spaces)

**Status:** ☐ Pass / ☐ Fail / ☐ N/A (if multi-space not supported)

**Issues Found:** _____________________________

---

### Step 14: Rule Disable/Enable Toggle ✓

**Goal:** Verify rule can be disabled and re-enabled

**Actions:**

1. Navigate to: **Security → Rules**
2. Find a correlation rule
3. Click: **Disable** (toggle or action menu)
4. Verify: Rule status changes to **Disabled**
5. Wait 5-10 minutes
6. Verify: No new correlation alerts created (rule is not executing)
7. Click: **Enable**
8. Verify: Rule status changes to **Enabled**
9. Wait for next execution
10. Verify: New correlation alerts created (rule is executing)

**Expected:**
- Disable stops rule execution immediately
- Enable resumes rule execution
- No errors during toggle

**Status:** ☐ Pass / ☐ Fail

**Issues Found:** _____________________________

---

### Step 15: Rule Delete Cleanup ✓

**Goal:** Verify rule deletion cleans up properly

**Actions:**

1. Create a test correlation rule
2. Wait for it to execute and create alerts
3. Navigate to: **Security → Rules**
4. Select the test rule
5. Click: **Delete**
6. Confirm deletion
7. Verify: Rule removed from Rules Management
8. Navigate to: **Security → Alerts**
9. Verify: Existing correlation alerts remain (not deleted)

**Expected:**
- Rule deletion succeeds
- Existing alerts preserved
- Rule no longer executes

**Status:** ☐ Pass / ☐ Fail

**Issues Found:** _____________________________

---

## Validation Summary

**Total Steps:** 15
**Passed:** _____ / 15
**Failed:** _____ / 15
**N/A:** _____ / 15

**Critical Issues Found:**
1. _____________________________
2. _____________________________

**Minor Issues Found:**
1. _____________________________
2. _____________________________

**Overall Assessment:**
- ✅ **PASS:** Spike is production-quality (0 critical issues, ≤2 minor issues)
- ⚠️ **CONDITIONAL PASS:** Spike is demo-ready with caveats (3-5 minor issues)
- ❌ **FAIL:** Spike has critical issues (≥1 critical issue)

**Recommended Action:** _____________________________

---

## Browser Compatibility (Optional Extended Testing)

**Test correlation rule creation in each browser:**

| Browser | Version | Status | Issues |
|---------|---------|--------|--------|
| Chrome | Latest | ☐ Pass / ☐ Fail | _____ |
| Firefox | Latest | ☐ Pass / ☐ Fail | _____ |
| Safari | Latest | ☐ Pass / ☐ Fail | _____ |
| Edge | Latest | ☐ Pass / ☐ Fail | _____ |

---

## Performance Spot Check (Optional)

**Test with larger alert volume:**

1. Load 1,000+ alerts into Elasticsearch
2. Create correlation rule with broad criteria (low threshold)
3. Trigger execution
4. Observe execution duration in Rule Details
5. Verify: Execution completes within 30s

**Result:**
- Alert volume: _____ alerts
- Execution duration: _____ seconds
- Status: ☐ Acceptable (<30s) / ☐ Slow (30-60s) / ☐ Timeout (>60s)

---

## Security Spot Check (Optional)

**Verify basic security controls:**

1. **Authorization:**
   - Log in as **Viewer** role (read-only)
   - Navigate to: **Security → Rules → Create new rule**
   - Verify: Create button is disabled OR Correlation type is hidden
   - Status: ☐ Pass / ☐ Fail

2. **Input Validation:**
   - Try creating rule with **malicious input** in Group By field:
     - `'; DROP TABLE alerts; --` (SQL injection test)
     - `<script>alert('xss')</script>` (XSS test)
   - Verify: Input is sanitized or rejected
   - Status: ☐ Pass / ☐ Fail

3. **Cross-Space Access:**
   - Log in as user with access to Space A only
   - Create correlation rule
   - Try setting **Target Spaces:** `[Space B]` (user doesn't have access)
   - Verify: Error or Space B not selectable
   - Status: ☐ Pass / ☐ Fail / ☐ N/A

---

## Validation Notes

**Testing Environment:**
- Kibana Version: _____
- Browser: _____
- OS: _____
- Date: _____

**Tester:** _____

**Additional Observations:**
_____________________________
_____________________________
_____________________________

---

## Post-Validation Actions

**If PASS:**
- ✅ Mark spike as **demo-ready**
- ✅ Proceed to stakeholder presentation
- ✅ Document any minor issues in "What's Next"

**If CONDITIONAL PASS:**
- ⚠️ Document known issues clearly
- ⚠️ Prepare workarounds for demo
- ⚠️ Schedule follow-up fixes

**If FAIL:**
- ❌ Fix critical issues before demo
- ❌ Re-run full validation workflow
- ❌ Escalate if blockers found

---

**Cleanup After Validation:**
```bash
./docs/demo/correlation_rules_demo_cleanup.sh
```

---

**Questions?** Contact: Patryk Kopycinski (@patrykkopycinski)
