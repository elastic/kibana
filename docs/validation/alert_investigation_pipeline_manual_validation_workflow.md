# Alert Investigation Pipeline - Manual Validation Workflow

**Purpose:** Step-by-step instructions for manually validating the spike works correctly.

**Audience:** QA engineers, developers, stakeholders

**Duration:** 30-45 minutes

**Status Tracking:** Check ✅/❌ for each step as you complete validation

---

## Prerequisites

- [ ] Kibana running locally (http://localhost:5601)
- [ ] Elasticsearch running locally (http://localhost:9200)
- [ ] Feature flag enabled (`elasticAssistant.alertInvestigationPipelineEnabled: true`)
- [ ] At least 10 security alerts available for testing

**Automated setup:**

```bash
./docs/demo/alert_investigation_pipeline_demo_setup.sh
```

---

## Validation Steps

### Step 1: Feature Flag Controls App Visibility

**Goal:** Verify feature flag properly enables/disables the pipeline app

**Test 1.1: Feature Disabled**

**Actions:**

1. Edit `config/kibana.yml`
2. Find or add:
   ```yaml
   xpack.feature_flags.overrides:
     elasticAssistant.alertInvestigationPipelineEnabled: false
   ```
3. Restart Kibana: `yarn start`
4. Wait for Kibana to start (~60 seconds)
5. Navigate to: http://localhost:5601
6. Check navigation sidebar for "Alert Investigation Pipeline" app

**Expected:**
- ❌ App does NOT appear in navigation
- ❌ Direct navigation to http://localhost:5601/app/alert-investigation-pipeline shows 404 or "App not found"

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

**Test 1.2: Feature Enabled**

**Actions:**

1. Edit `config/kibana.yml`
2. Change to:
   ```yaml
   xpack.feature_flags.overrides:
     elasticAssistant.alertInvestigationPipelineEnabled: true
   ```
3. Restart Kibana: `yarn start`
4. Wait for Kibana to start (~60 seconds)
5. Navigate to: http://localhost:5601
6. Check navigation sidebar for "Alert Investigation Pipeline" app
7. Click on the app

**Expected:**
- ✅ App APPEARS in navigation (under Security category)
- ✅ Clicking app loads pipeline dashboard
- ✅ Dashboard shows health status and metrics

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 2: Pipeline API - Dry Run Mode

**Goal:** Verify pipeline dry-run mode works without side effects

**Actions:**

1. Open terminal or API client (Postman, Insomnia, etc.)
2. Execute dry-run request:

```bash
curl -X POST "http://localhost:5601/internal/elastic_assistant/attack_discovery/pipeline/_run" \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: true' \
  -H 'Authorization: ApiKey YOUR_API_KEY' \
  -d '{
    "dry_run": true,
    "max_alerts": 100,
    "lookback_minutes": 60,
    "similarity_threshold": 0.85
  }'
```

3. Verify response

**Expected Response:**
```json
{
  "status": "dry_run_complete",
  "alertsProcessed": <number>,
  "alertsDeduplicated": <number>,
  "deduplicationRate": <0.0-1.0>,
  "leaderAlerts": <number>,
  "entitiesExtracted": <number>,
  "entityBreakdown": {
    "ipv4": <count>,
    "user": <count>,
    "process": <count>,
    ...
  },
  "clusters": [...]
}
```

**Verify:**
- ✅ HTTP 200 response
- ✅ `status` field is `"dry_run_complete"`
- ✅ Metrics returned (alertsProcessed, deduplicationRate, etc.)
- ✅ Entity breakdown includes at least 3 types
- ✅ Clusters array present

**Verify NO side effects:**
- ❌ No new cases created (check http://localhost:5601/app/security/cases)
- ❌ No alerts tagged with `kibana.alert.pipeline.processed`
- ❌ No tracker indices created (check Elasticsearch)

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 3: Pipeline API - Full Execution

**Goal:** Verify pipeline creates cases and attaches alerts

**Actions:**

1. Note current case count: http://localhost:5601/app/security/cases
2. Execute full pipeline run:

```bash
curl -X POST "http://localhost:5601/internal/elastic_assistant/attack_discovery/pipeline/_run" \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: true' \
  -H 'Authorization: ApiKey YOUR_API_KEY' \
  -d '{
    "dry_run": false,
    "max_alerts": 100,
    "lookback_minutes": 60,
    "similarity_threshold": 0.85
  }'
```

3. Verify response
4. Check cases page for new cases

**Expected:**
- ✅ HTTP 200 response
- ✅ `status` field is `"complete"`
- ✅ New cases created (case count increased)
- ✅ Cases have attached alerts
- ✅ Cases have observables (auto-extracted entities)

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

**Cases created:** _____ (count)

---

### Step 4: Deduplication Accuracy

**Goal:** Verify similar alerts are grouped correctly

**Actions:**

1. Find 2-3 similar alerts in Security Alerts page
   - Same source IP
   - Same user
   - Same attack technique
2. Note their IDs
3. Run pipeline (full execution)
4. Check if those alerts were deduplicated into same cluster
5. Verify they were attached to the same case

**Expected:**
- ✅ Similar alerts grouped into same cluster
- ✅ All similar alerts attached to same case
- ✅ Deduplication rate > 50% (depends on alert diversity)

**Status:** ✅ Pass / ❌ Fail

**Deduplication rate:** _____ %

**Notes:** _____________________________

---

### Step 5: Entity Extraction Accuracy

**Goal:** Verify entities are correctly extracted from alerts

**Actions:**

1. Open a case created by pipeline
2. Expand "Observables" section
3. Review extracted entities
4. Cross-reference with source alerts:
   - Open attached alert
   - Check ECS fields (source.ip, user.name, process.name, etc.)
   - Verify entities match alert fields

**Expected:**
- ✅ Observables section populated
- ✅ At least 3 entity types present (IP, user, process)
- ✅ Entity values match source alert ECS fields
- ✅ No duplicate entities (deduplication works)

**Status:** ✅ Pass / ❌ Fail

**Entity types found:** _____ (list: ipv4, user, process, etc.)

**Extraction accuracy:** _____ % (manual spot check of 10 entities)

**Notes:** _____________________________

---

### Step 6: Case Matching Algorithm

**Goal:** Verify alerts are correctly matched to existing cases

**Actions:**

1. Create a case manually with specific observables:
   - Add observable: IP = `192.168.1.100`
   - Add observable: User = `admin`
2. Create a security alert with matching entities:
   - `source.ip: 192.168.1.100`
   - `user.name: admin`
3. Run pipeline
4. Verify alert was attached to existing case (not new case created)

**Expected:**
- ✅ Alert matched to existing case (entity overlap detected)
- ✅ Alert attached to existing case
- ✅ No duplicate case created
- ✅ Case observable count did NOT increase (dedup works)

**Status:** ✅ Pass / ❌ Fail

**Match score:** _____ (if shown in logs)

**Notes:** _____________________________

---

### Step 7: Incremental Attack Discovery Trigger

**Goal:** Verify incremental AD processes only new alerts

**Actions:**

1. Get a case ID that has alerts attached
2. Note the current alert count in case
3. Execute incremental AD trigger:

```bash
curl -X POST "http://localhost:5601/internal/elastic_assistant/attack_discovery/pipeline/case/CASE_ID/_trigger_ad" \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: true' \
  -H 'Authorization: ApiKey YOUR_API_KEY' \
  -d '{
    "alert_ids": ["existing-alert-1", "existing-alert-2", "new-alert-3"]
  }'
```

**Expected Response:**
```json
{
  "caseId": "case-uuid",
  "triggered": true,
  "deltaAlerts": 1,
  "totalAlerts": 3,
  "previouslyProcessed": 2,
  "message": "Incremental AD would process 1 new alerts for case ..."
}
```

**Verify:**
- ✅ `triggered: true`
- ✅ `deltaAlerts` = number of NEW alerts (not total)
- ✅ `previouslyProcessed` = number of previously processed alerts
- ✅ Only delta alerts processed (not all alerts)

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 8: Error Handling - Feature Flag Disabled

**Goal:** Verify graceful handling when feature is disabled

**Actions:**

1. Disable feature flag in kibana.yml:
   ```yaml
   xpack.feature_flags.overrides:
     elasticAssistant.alertInvestigationPipelineEnabled: false
   ```
2. Restart Kibana
3. Try to run pipeline via API:

```bash
curl -X POST "http://localhost:5601/internal/elastic_assistant/attack_discovery/pipeline/_run" \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: true' \
  -H 'Authorization: ApiKey YOUR_API_KEY' \
  -d '{"dry_run": true}'
```

4. Check response

**Expected:**
- ✅ HTTP 403 Forbidden
- ✅ Response body contains clear message about feature being disabled
- ✅ Instructions on how to enable feature flag provided

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 9: Error Handling - No Alerts Available

**Goal:** Verify graceful handling when no alerts match criteria

**Actions:**

1. Re-enable feature flag and restart Kibana
2. Run pipeline with very short lookback (no alerts should match):

```bash
curl -X POST "http://localhost:5601/internal/elastic_assistant/attack_discovery/pipeline/_run" \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: true' \
  -H 'Authorization: ApiKey YOUR_API_KEY' \
  -d '{
    "dry_run": false,
    "max_alerts": 10,
    "lookback_minutes": 1,
    "similarity_threshold": 0.85
  }'
```

**Expected:**
```json
{
  "status": "no_alerts",
  "alertsProcessed": 0,
  "alertsDeduplicated": 0,
  "entitiesExtracted": 0
}
```

**Verify:**
- ✅ HTTP 200 response
- ✅ `status: "no_alerts"`
- ✅ Metrics are 0
- ✅ No error thrown
- ✅ No cases created

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 10: Pipeline Dashboard Displays Correctly

**Goal:** Verify dashboard UI renders correctly and shows accurate data

**Actions:**

1. Navigate to: http://localhost:5601/app/alert-investigation-pipeline
2. Open browser DevTools: Console tab (Cmd+Option+J on Mac, Ctrl+Shift+J on Windows)
3. Verify dashboard loads

**Visual Verification:**

- [ ] Page title: "Alert Investigation Pipeline"
- [ ] Refresh button visible and functional
- [ ] Health status indicator (healthy/degraded/unhealthy with color)
- [ ] Metrics panels:
  - [ ] Total Runs
  - [ ] Success Rate (%)
  - [ ] Last Run (timestamp)
  - [ ] Average Processing Time
- [ ] Layout is responsive (resize browser window to 1024px, 1440px, 1920px)
- [ ] No horizontal scrollbars
- [ ] No missing components (broken layouts)

**Console Verification:**

- [ ] No JavaScript errors (red messages)
- [ ] No React warnings (yellow messages)
- [ ] No 404s for assets (check Network tab)
- [ ] No unhandled promise rejections

**Status:** ✅ Pass / ❌ Fail

**Bugs found:** _____________________________

---

### Step 11: API Parameter Validation

**Goal:** Verify API validates input parameters

**Test 11.1: Invalid max_alerts (too high)**

```bash
curl -X POST "http://localhost:5601/internal/elastic_assistant/attack_discovery/pipeline/_run" \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: true' \
  -d '{"dry_run": true, "max_alerts": 99999}'
```

**Expected:** HTTP 400 with validation error message

**Status:** ✅ Pass / ❌ Fail

---

**Test 11.2: Invalid similarity_threshold (out of range)**

```bash
curl -X POST "http://localhost:5601/internal/elastic_assistant/attack_discovery/pipeline/_run" \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: true' \
  -d '{"dry_run": true, "similarity_threshold": 1.5}'
```

**Expected:** HTTP 400 with validation error (threshold must be 0-1)

**Status:** ✅ Pass / ❌ Fail

---

**Test 11.3: Missing required field (should use defaults)**

```bash
curl -X POST "http://localhost:5601/internal/elastic_assistant/attack_discovery/pipeline/_run" \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: true' \
  -d '{}'
```

**Expected:** HTTP 200 (defaults applied: dry_run=false, max_alerts=500, etc.)

**Status:** ✅ Pass / ❌ Fail

---

### Step 12: Performance Under Load

**Goal:** Verify pipeline handles moderate load without errors

**Actions:**

1. Run load test script:

```bash
./docs/demo/alert_investigation_pipeline_demo_load_test.sh --requests 10 --concurrent 2
```

2. Review results

**Expected:**
- ✅ All requests succeed (100% success rate)
- ✅ Average duration < 5000ms (5 seconds)
- ✅ P95 duration < 10000ms (10 seconds)
- ✅ No timeout errors
- ✅ No memory leaks (check Kibana memory usage before/after)

**Results:**
- Total requests: _____
- Success rate: _____ %
- Avg duration: _____ ms
- P95 duration: _____ ms

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 13: Browser Compatibility (Optional but Recommended)

**Goal:** Verify pipeline dashboard works across browsers

**Test in each browser:**

- [ ] Chrome (primary)
- [ ] Firefox
- [ ] Safari
- [ ] Edge

**Actions per browser:**

1. Open browser
2. Navigate to: http://localhost:5601/app/alert-investigation-pipeline
3. Verify dashboard loads correctly
4. Check DevTools Console for errors
5. Verify metrics display correctly
6. Click Refresh button

**Expected:**
- ✅ Dashboard renders correctly in all browsers
- ✅ No browser-specific console errors
- ✅ Refresh button works
- ✅ Metrics display consistently

**Status:** ✅ Pass / ❌ Fail

**Browser-specific issues:** _____________________________

---

### Step 14: Concurrent Pipeline Runs

**Goal:** Verify pipeline handles concurrent executions safely

**Actions:**

1. Open 2 terminal windows
2. Execute pipeline run in both simultaneously:

**Terminal 1:**
```bash
curl -X POST "http://localhost:5601/internal/elastic_assistant/attack_discovery/pipeline/_run" \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: true' \
  -d '{"dry_run": false, "max_alerts": 100}'
```

**Terminal 2 (execute immediately after Terminal 1):**
```bash
curl -X POST "http://localhost:5601/internal/elastic_assistant/attack_discovery/pipeline/_run" \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: true' \
  -d '{"dry_run": false, "max_alerts": 100}'
```

**Expected:**
- ✅ Both requests return HTTP 200
- ✅ No race conditions (duplicate cases created)
- ✅ No database lock errors
- ✅ Metrics are consistent
- ✅ Total cases = unique clusters (not 2x clusters)

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 15: Alert Processing Idempotency

**Goal:** Verify alerts are not re-processed on subsequent pipeline runs

**Actions:**

1. Run pipeline once:
```bash
curl -X POST "http://localhost:5601/internal/elastic_assistant/attack_discovery/pipeline/_run" \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: true' \
  -d '{"dry_run": false, "max_alerts": 50}'
```

2. Note `alertsProcessed` count
3. Run pipeline again with same parameters (immediately after):
```bash
curl -X POST "http://localhost:5601/internal/elastic_assistant/attack_discovery/pipeline/_run" \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: true' \
  -d '{"dry_run": false, "max_alerts": 50}'
```

4. Note `alertsProcessed` count from second run

**Expected:**
- ✅ Second run processes **0 alerts** (all already tagged as processed)
- ✅ Response: `{"status": "no_alerts", "alertsProcessed": 0}`
- ✅ No duplicate cases created
- ✅ Alerts are tagged with `kibana.alert.pipeline.processed: true`

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 16: Incremental AD Delta Processing

**Goal:** Verify incremental AD only processes new alerts

**Actions:**

1. Get a case ID from pipeline-created cases
2. Trigger AD with same alerts twice:

**First trigger:**
```bash
curl -X POST "http://localhost:5601/internal/elastic_assistant/attack_discovery/pipeline/case/CASE_ID/_trigger_ad" \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: true' \
  -d '{"alert_ids": ["alert-1", "alert-2", "alert-3"]}'
```

**Expected:** `{"triggered": true, "deltaAlerts": 3, "previouslyProcessed": 0}`

**Second trigger (same alerts):**
```bash
curl -X POST "http://localhost:5601/internal/elastic_assistant/attack_discovery/pipeline/case/CASE_ID/_trigger_ad" \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: true' \
  -d '{"alert_ids": ["alert-1", "alert-2", "alert-3"]}'
```

**Expected:** `{"triggered": false, "deltaAlerts": 0, "previouslyProcessed": 3, "reason": "Only 0 new alerts, need at least 2"}`

**Verify:**
- ✅ First trigger processes all 3 alerts
- ✅ Second trigger processes 0 alerts (already processed)
- ✅ Tracker index persists processed alert IDs
- ✅ `triggered: false` when no new alerts

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 17: Dashboard Metrics Accuracy

**Goal:** Verify dashboard metrics match actual pipeline execution

**Actions:**

1. Note dashboard metrics BEFORE pipeline run
2. Run pipeline (full execution)
3. Refresh dashboard
4. Compare metrics AFTER pipeline run

**Verify:**
- ✅ Total Runs increased by 1
- ✅ Success Rate updated (if run succeeded)
- ✅ Last Run timestamp is recent (within last minute)
- ✅ Average Processing Time is reasonable (< 10 seconds for 100 alerts)

**Status:** ✅ Pass / ❌ Fail

**Metrics before:**
- Total Runs: _____
- Success Rate: _____ %

**Metrics after:**
- Total Runs: _____
- Success Rate: _____ %
- Last Run: _____
- Avg Processing Time: _____ ms

**Notes:** _____________________________

---

### Step 18: Network Error Resilience (Optional Advanced Test)

**Goal:** Verify pipeline handles Elasticsearch/Kibana network issues gracefully

**Actions:**

1. Start pipeline run
2. While running, simulate network issue:
   - **Option A:** Kill Elasticsearch briefly: `pkill -STOP -f elasticsearch` (pause process)
   - **Option B:** Block network via firewall (advanced)
3. Wait 5-10 seconds
4. Resume Elasticsearch: `pkill -CONT -f elasticsearch`
5. Check pipeline response

**Expected:**
- ✅ Pipeline returns error (not silent failure)
- ✅ Error message is clear ("Elasticsearch connection failed" or similar)
- ✅ No partial data created (no half-created cases)
- ✅ Retry is possible (can re-run pipeline)

**Status:** ✅ Pass / ❌ Fail / ⏭️ Skipped

**Notes:** _____________________________

---

### Step 19: Console Clean (No Errors)

**Goal:** Verify no JavaScript errors during normal operation

**Actions:**

1. Open browser: http://localhost:5601/app/alert-investigation-pipeline
2. Open DevTools: Console tab (Cmd+Option+J on Mac)
3. Clear console
4. Perform these actions:
   - Refresh dashboard (click Refresh button)
   - Navigate away and back to pipeline app
   - Wait 30 seconds (check for polling errors)
5. Review console

**Expected:**
- ✅ Zero console errors (red messages)
- ✅ Zero React warnings (yellow messages)
- ✅ Zero unhandled promise rejections
- ✅ No 404s for assets (check Network tab)

**Status:** ✅ Pass / ❌ Fail

**Errors found:** _____________________________

---

### Step 20: End-to-End Workflow (Happy Path)

**Goal:** Validate complete workflow works from start to finish

**Actions:**

1. Start fresh (clean state):
   - Delete all pipeline-created cases
   - Remove `kibana.alert.pipeline.processed` tags from alerts
   - Clear tracker indices

2. Run complete workflow:
   ```bash
   # Step 1: Dry run (validate)
   curl -X POST ".../pipeline/_run" -d '{"dry_run": true, "max_alerts": 100}'

   # Step 2: Full run (execute)
   curl -X POST ".../pipeline/_run" -d '{"dry_run": false, "max_alerts": 100}'
   ```

3. Verify results:
   - Navigate to Cases page
   - Open a created case
   - Verify alerts attached
   - Verify observables extracted
   - Trigger incremental AD for case
   - Verify AD triggered correctly

**Expected:**
- ✅ Dry run returns metrics (no side effects)
- ✅ Full run creates cases
- ✅ Cases have alerts attached
- ✅ Observables auto-populated
- ✅ Incremental AD triggers successfully
- ✅ No errors at any step
- ✅ Processing time < 10 seconds for 100 alerts

**Status:** ✅ Pass / ❌ Fail

**End-to-end time:** _____ seconds

**Notes:** _____________________________

---

## Validation Summary

**Total steps:** 20
**Passed:** ____ / 20
**Failed:** ____ / 20
**Skipped:** ____ / 20

**Pass threshold:** ≥ 18/20 (90%)

---

## Critical Issues Found

**Issues that BLOCK demo/merge:**

1. _____________________________
2. _____________________________
3. _____________________________

---

## Major Issues Found

**Issues that degrade UX (should fix before demo):**

1. _____________________________
2. _____________________________
3. _____________________________

---

## Minor Issues Found

**Issues that are polish items (can defer):**

1. _____________________________
2. _____________________________

---

## Overall Assessment

**Status:** (select one)

- [ ] ✅ **PASS:** Spike is demo-ready (≥18/20 steps passed, 0 critical issues)
- [ ] ⚠️ **CONDITIONAL PASS:** Spike is demo-ready with caveats (15-17/20 passed, 1-2 minor issues)
- [ ] ❌ **FAIL:** Spike is NOT demo-ready (< 15/20 passed OR critical issues exist)

**Recommended action:**

- ✅ If PASS: Proceed to screenshot capture and demo rehearsal
- ⚠️ If CONDITIONAL PASS: Fix major issues, document caveats, proceed to demo
- ❌ If FAIL: Fix critical issues, re-run validation

---

## Next Steps

**If validation PASSED:**
1. [ ] Capture screenshots during manual testing
2. [ ] Rehearse demo script (2-3 times)
3. [ ] Complete spike documentation
4. [ ] Create PR with all artifacts

**If validation FAILED:**
1. [ ] Fix critical issues (prioritize by severity)
2. [ ] Re-run failed validation steps
3. [ ] Update this worksheet with results
4. [ ] Escalate if blockers cannot be resolved

---

## Cleanup

After validation, run cleanup:

```bash
./docs/demo/alert_investigation_pipeline_demo_cleanup.sh
```

**Options:**
- Keep data for demo: `--keep-data`
- Keep feature flag enabled: `--keep-flag`

---

## Validation Worksheet Metadata

**Validator:** _____________________________
**Date:** 2026-03-20 (update with actual date)
**Kibana Version:** _____________________________ (e.g., 9.4.0-SNAPSHOT)
**Elasticsearch Version:** _____________________________ (get from `http://localhost:9200`)
**Test Environment:** Local dev / CI / Staging (circle one)
**Duration:** _____ minutes

**Approval:** _____________________________ (signature/name)
**Date:** _____________________________ (approval date)
