# MITRE ATT&CK Auto-Mapper - Validation Workflow

**Purpose:** Step-by-step manual validation checklist
**Duration:** 30-45 minutes
**Validates:** Workflows integration, MITRE mapping, hybrid logic, caching

---

## Prerequisites

- [ ] Kibana running locally
- [ ] Feature flag enabled (`mitreAutoMapEnabled`)
- [ ] Workflows Extensions plugin available
- [ ] Default workflow imported

---

## Validation Steps

### Step 1: Verify Workflows Registration (5 min)

**Goal:** Confirm trigger and step are registered

**Actions:**

1. Start Kibana: `yarn start`
2. Navigate to: **Stack Management → Workflows**
3. Click: **Create new workflow**
4. In trigger dropdown, search: "high-risk alert"
5. Verify: `security-solution.highRiskAlertIndexed` appears
6. Select trigger
7. In step dropdown, search: "MITRE"
8. Verify: `security-solution.mapAlertToMitre` appears

**Expected:**
- ✅ Trigger registered and visible
- ✅ Step registered and visible
- ✅ Documentation appears in help panel

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 2: Import Default Workflow (5 min)

**Goal:** Verify default workflow can be imported

**Actions:**

1. Navigate to: **Stack Management → Workflows**
2. Click: **Import workflow**
3. Select: `server/workflows/definitions/mitre_auto_mapper.yaml`
4. Click: **Import**
5. Verify: "MITRE ATT&CK Auto-Mapper" appears in workflow list
6. Click workflow name → Open details
7. Verify trigger: `security-solution.highRiskAlertIndexed`
8. Verify condition: `event.hasRuleMitreTags: false OR event.riskScore >= 75`
9. Verify step: `map_to_mitre` (type: `security-solution.mapAlertToMitre`)

**Expected:**
- ✅ Workflow imports without errors
- ✅ Trigger and steps configured correctly
- ✅ Workflow status: "Enabled"

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 3: Test Gap-Filling (Custom Rule, No Tags) (10 min)

**Goal:** Verify auto-mapping for untagged rules

**Actions:**

1. Navigate to: **Security → Rules → Detection rules (SIEM)**
2. Click: **Create new rule**
3. Select: **Custom query**
4. Configure:
   - **Custom query:** `process.name: "powershell.exe"`
   - **Name:** "Test - PowerShell Execution (No MITRE Tags)"
   - **Risk score:** 75
   - **Severity:** High
   - **MITRE ATT&CK:** LEAVE EMPTY (skip this section)
5. Save and enable rule

6. Trigger alert:
   - Option A: Run PowerShell on monitored host
   - Option B: Use Dev Tools to create test alert:
     ```
     POST .alerts-security.alerts-default/_doc
     {
       "@timestamp": "2026-03-22T12:00:00Z",
       "process.name": "powershell.exe",
       "process.command_line": "powershell -enc AAAAAA",
       "event.action": "process_start",
       "kibana.alert.rule.name": "Test - PowerShell Execution (No MITRE Tags)",
       "kibana.alert.risk_score": 75,
       "kibana.alert.rule.threat": []
     }
     ```

7. Wait 5-10 seconds (workflow execution time)

8. Navigate to: **Security → Alerts**
9. Find alert: "Test - PowerShell Execution"
10. Click alert → Open details flyout
11. Scroll to: **Threat** section (or search for "MITRE" in JSON)

**Expected:**
```json
{
  "threat.framework": "MITRE ATT&CK",
  "threat.technique.id": ["T1059.001"],
  "threat.technique.name": ["PowerShell"],
  "threat.tactic.name": ["Execution"],
  "threat.phase": "Execution",
  "kibana.alert.mitre.mapping_source": "llm_auto_map_workflow"
}
```

**Verify:**
- ✅ MITRE tags present
- ✅ Technique ID is T1059.001 (PowerShell)
- ✅ Tactic is "Execution"
- ✅ mapping_source is "llm_auto_map_workflow"

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 4: Verify Workflow Executed (2 min)

**Goal:** Confirm workflow ran successfully

**Actions:**

1. Navigate to: **Stack Management → Workflows**
2. Click: "MITRE ATT&CK Auto-Mapper" workflow
3. Click: **Executions** tab
4. Find most recent execution (last 5 min)
5. Click execution → View details
6. Verify:
   - Trigger: `security-solution.highRiskAlertIndexed`
   - Event payload: `{ alertId: "...", riskScore: 75, hasRuleMitreTags: false }`
   - Step `map_to_mitre`: Status = Success
   - Output: `{ success: true, techniqueIds: ["T1059.001"], cached: false }`

**Expected:**
- ✅ Execution completed successfully
- ✅ Step output shows techniques found
- ✅ cached: false (first time, LLM call)

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 5: Test Caching (Identical Alert) (5 min)

**Goal:** Verify 90% cache hit rate works

**Actions:**

1. Trigger identical alert again (same process name + action)
2. Wait 5-10 seconds
3. Check workflow execution (should be new execution)
4. Verify output: `{ success: true, techniqueIds: ["T1059.001"], cached: true }`

**Expected:**
- ✅ Second alert also has MITRE tags
- ✅ Workflow execution shows `cached: true`
- ✅ Execution time <100ms (vs 200-500ms first time)

**Status:** ✅ Pass / ❌ Fail

**Cache hit rate:** _____% (expect ~100% for identical alerts)

---

### Step 6: Test Hybrid Logic (Prebuilt Rule with Tags) (10 min)

**Goal:** Verify auto-mapper skips when rule has tags (unless indicators)

**Actions:**

1. Find prebuilt rule with MITRE tags:
   - Navigate to: **Security → Rules**
   - Search: "MITRE ATT&CK" (find rule with tags pre-configured)
   - Enable a simple rule (e.g., "Network Connection by Suspicious Process")

2. Trigger alert from that rule
3. Wait 5-10 seconds
4. Check alert details
5. Verify: MITRE tags present (from rule, NOT from auto-mapper)
6. Check: `kibana.alert.mitre.mapping_source` field
   - Should be UNDEFINED (auto-mapper skipped)
   - OR "llm_auto_map+rule" (auto-mapper found additional techniques)

7. Check workflow executions:
   - If skipped: No execution for this alert (condition filtered it)
   - If extended: Execution shows additional techniques added

**Expected:**
- ✅ Alert has MITRE tags (from rule)
- ✅ Auto-mapper skipped OR extended (hybrid logic working)
- ✅ No duplicate tags

**Status:** ✅ Pass / ❌ Fail

**Behavior:** Skipped / Extended with additional TTPs

---

### Step 7: Test ML Alert (No Rule) (Optional, 5 min)

**Goal:** Verify mapping works for ML alerts (no rule = no tags)

**Prerequisites:** ML anomaly detection job configured

**Actions:**

1. If ML job available: Trigger anomaly
2. Wait for ML alert to be created
3. Check alert details
4. Verify: MITRE tags present (from auto-mapper)

**Expected:**
- ✅ ML alert has MITRE tags
- ✅ mapping_source: "llm_auto_map_workflow"

**Status:** ✅ Pass / ❌ Fail / ⏭️ Skipped (no ML job)

---

## Validation Summary

**Total steps:** 7 (6 required, 1 optional)
**Passed:** ____ / 7
**Failed:** ____ / 7
**Skipped:** ____ / 7

**Critical issues:**
1. _____________________________
2. _____________________________

**Minor issues:**
1. _____________________________
2. _____________________________

**Overall assessment:**
- ✅ **PASS:** Spike is production-ready (0 critical issues)
- ⚠️ **CONDITIONAL PASS:** Minor issues to address
- ❌ **FAIL:** Critical integration issues

---

## Performance Metrics

**Capture during validation:**

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| **Workflow exec time (cache hit)** | <100ms | ___ms | ✅/❌ |
| **Workflow exec time (cache miss)** | 200-500ms | ___ms | ✅/❌ |
| **Cache hit rate (after 10 alerts)** | >80% | ___%  | ✅/❌ |
| **Alert enrichment success rate** | >90% | ___%  | ✅/❌ |

---

## Next Steps

**If validation passes:**
- [ ] Create PR
- [ ] Demo to stakeholders
- [ ] Plan production implementation

**If validation fails:**
- [ ] Document failures
- [ ] Fix critical issues
- [ ] Re-validate

---

**Validation completed by:** _____________________________
**Date:** _____________________________
**Result:** ✅ Pass / ⚠️ Conditional / ❌ Fail
