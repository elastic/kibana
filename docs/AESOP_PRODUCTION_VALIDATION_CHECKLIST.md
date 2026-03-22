# AESOP PoC - Production Validation Checklist

**Date:** 2026-03-22
**Branch:** `spike/aesop-spike`
**Status:** 🟡 **READY FOR VALIDATION**

---

## Pre-Validation Setup

**Run these commands before starting validation:**

```bash
# 1. Bootstrap dependencies (first time only)
yarn kbn bootstrap

# 2. Verify @kbn/llm-batch-processing package builds
cd x-pack/platform/packages/shared/kbn-llm-batch-processing
yarn build
cd -

# 3. Type check evals plugin
node scripts/type_check --project x-pack/platform/plugins/shared/evals/tsconfig.json

# 4. Run unit tests
yarn test:jest x-pack/platform/plugins/shared/evals/

# 5. Start Elasticsearch (if not running)
yarn es snapshot --license trial &

# 6. Start Kibana
yarn start
```

---

## Validation Checklist

### ✅ Phase 1: Build & Compilation

- [ ] **Bootstrap completes**: `yarn kbn bootstrap` runs without errors
- [ ] **TypeScript compiles**: No type errors in evals plugin
- [ ] **ESLint passes**: `node scripts/eslint x-pack/platform/plugins/shared/evals/`
- [ ] **@kbn/llm-batch-processing builds**: Package compiles successfully
- [ ] **Unit tests pass**: All new test files execute without failures

**Expected Results:**
- Zero compilation errors
- Zero ESLint errors
- All unit tests green (4 test suites added)

**Status:** [ ] Pass / [ ] Fail

**Notes:** ________________________________

---

### ✅ Phase 2: Plugin Initialization

- [ ] **Kibana starts**: No errors in startup logs
- [ ] **Evals plugin loads**: Check logs for "Setting up Evals plugin"
- [ ] **AESOP routes registered**: Check logs for "Registering AESOP routes"
- [ ] **Agent auto-creation attempted**: Check logs for "Auto-creating AESOP agents"
- [ ] **Workflow registration attempted**: Check logs for "Registering AESOP workflows"

**Verification Commands:**

```bash
# Watch Kibana logs
tail -f logs/kibana.log | grep -i "aesop\|evals"

# Check plugin status
curl -s http://localhost:5601/api/status | jq '.status.plugins.evals'

# Verify routes exist
curl -u elastic:changeme "http://localhost:5601/internal/aesop/skills/proposed" 2>&1 | head -10
# Expected: {"skills": []} or valid JSON (NOT 404)
```

**Expected Results:**
- Kibana starts successfully
- Evals plugin status: "available"
- AESOP routes return valid responses (not 404)

**Status:** [ ] Pass / [ ] Fail

**Notes:** ________________________________

---

### ✅ Phase 3: UI Navigation

- [ ] **Evals app accessible**: Navigate to `http://localhost:5601/app/management/ai/evals`
- [ ] **AESOP tab visible**: "AESOP" tab appears in navigation
- [ ] **Proposed Skills page loads**: Click AESOP tab → page renders
- [ ] **Exploration Dashboard accessible**: Navigate to `/aesop/exploration` → page renders
- [ ] **No console errors**: Browser console has zero JavaScript errors

**Manual Steps:**

1. Open Kibana: `http://localhost:5601`
2. Login: `elastic` / `changeme`
3. Navigate to: Stack Management → AI → Evaluations
4. Verify: 3 tabs visible (Runs, Datasets, AESOP)
5. Click: AESOP tab
6. Verify: Proposed Skills page loads
7. Open DevTools console
8. Verify: Zero errors (no red messages)

**Expected Results:**
- All pages load successfully
- Zero console errors
- Navigation works smoothly

**Status:** [ ] Pass / [ ] Fail

**Notes:** ________________________________

---

### ✅ Phase 4: API Functionality

- [ ] **List proposed skills works**: `GET /internal/aesop/skills/proposed` returns array
- [ ] **Run exploration works**: `POST /internal/aesop/exploration/run` accepts request
- [ ] **Skill validation works**: `POST /internal/aesop/skills/{id}/validate` executes
- [ ] **Approve skill works**: `POST /internal/aesop/skills/{id}/approve` deploys skill
- [ ] **Reject skill works**: `POST /internal/aesop/skills/{id}/reject` stores feedback

**API Test Script:**

```bash
#!/bin/bash
# test_aesop_apis.sh

BASE_URL="http://localhost:5601"
AUTH="elastic:changeme"

# Test 1: List proposed skills
echo "=== Test 1: List Proposed Skills ==="
curl -s -u "$AUTH" "$BASE_URL/internal/aesop/skills/proposed" | jq '.'
echo ""

# Test 2: Trigger exploration (dry-run mode if available)
echo "=== Test 2: Trigger Exploration ==="
curl -s -X POST -u "$AUTH" "$BASE_URL/internal/aesop/exploration/run" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "agent_role": "SOC analyst",
    "scoped_indices": [".alerts-security.alerts-*"],
    "exploration_depth": 10,
    "dry_run": true
  }' | jq '.'
echo ""

# Add more API tests as needed
```

**Expected Results:**
- All endpoints return valid JSON (not 404 or 500)
- Exploration endpoint accepts request (may not complete if workflows not registered)
- Error responses are well-structured (custom error classes working)

**Status:** [ ] Pass / [ ] Fail

**Notes:** ________________________________

---

### ✅ Phase 5: Agent Builder Integration

- [ ] **Agents created**: Check Agent Builder for 6 AESOP agents
- [ ] **Agent IDs correct**: `aesop.schema_categorizer`, `aesop.pattern_analyzer`, etc.
- [ ] **Agent invocation works**: Can manually invoke an agent

**Verification:**

```bash
# Check if agents exist (requires Agent Builder API endpoint)
# This is plugin-dependent - check Agent Builder documentation

# Alternative: Check Kibana logs for agent creation
grep "AESOP agents created successfully" logs/kibana.log

# If Agent Builder not available:
grep "Agent Builder plugin not available" logs/kibana.log
```

**Expected Results:**
- If Agent Builder available: 6 agents created
- If Agent Builder not available: Graceful log message (not error)

**Status:** [ ] Pass / [ ] Fail / [ ] N/A (Agent Builder not available)

**Notes:** ________________________________

---

### ✅ Phase 6: Workflow Execution (If Workflows Plugin Available)

- [ ] **Workflows registered**: Check logs for "AESOP workflows registered"
- [ ] **Workflows loadable**: Can list AESOP workflows via API
- [ ] **Workflow execution**: Can trigger `aesop.self_exploration` workflow

**Verification:**

```bash
# Check if workflows registered (requires Workflows plugin API)
# This is plugin-dependent - check Workflows documentation

# Alternative: Check Kibana logs
grep "AESOP workflow registration" logs/kibana.log
```

**Expected Results:**
- If Workflows available: 3 workflows registered
- If Workflows not available: Graceful log message (API-triggered execution still works)

**Status:** [ ] Pass / [ ] Fail / [ ] N/A (Workflows plugin not available)

**Notes:** ________________________________

---

### ✅ Phase 7: Integration Test (E2E Dry Run)

**Goal:** Verify full cycle works (even if using mock data)

**Steps:**

1. Trigger exploration via API (use dry_run mode or small data subset)
2. Monitor execution (check logs for progress)
3. Verify proposed skills appear in UI
4. Test skill review flyout opens
5. Test approve/reject actions

**Dry Run Command:**

```bash
curl -X POST -u elastic:changeme "http://localhost:5601/internal/aesop/exploration/run" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -d '{
    "agent_role": "SOC analyst",
    "scoped_indices": [".alerts-security.alerts-default"],
    "exploration_depth": 5,
    "max_patterns": 2
  }'
```

**Expected Results:**
- Exploration completes (or provides clear error if workflows not available)
- Skills appear in `.aesop-proposed-skills` index
- UI shows proposed skills
- Can interact with skills (view details, approve/reject)

**Status:** [ ] Pass / [ ] Fail

**Notes:** ________________________________

---

## Production Readiness Summary

### Completed Integration Work

**Critical gaps filled (this session):**
1. ✅ Plugin integration: AESOP routes registered in plugin.ts
2. ✅ Agent auto-creation: Hooks into plugin start lifecycle
3. ✅ Workflow registration: Added (with graceful degradation)
4. ✅ @kbn/llm-batch-processing: Restored from git history (5 source files + tests)
5. ✅ Dependencies declared: kibana.jsonc updated with agentBuilder, workflows
6. ✅ UI navigation: AESOP tab added to evals app
7. ✅ Test coverage: 4 new test files added (routes + error classes)

**Files Modified:**
- `x-pack/platform/plugins/shared/evals/server/plugin.ts`
- `x-pack/platform/plugins/shared/evals/server/types.ts`
- `x-pack/platform/plugins/shared/evals/kibana.jsonc`
- `x-pack/platform/plugins/shared/evals/public/application.tsx`

**Files Created:**
- `x-pack/platform/packages/shared/kbn-llm-batch-processing/src/*.ts` (5 files)
- `x-pack/platform/packages/shared/kbn-llm-batch-processing/__tests__/*.test.ts` (1 file)
- `x-pack/platform/packages/shared/kbn-llm-batch-processing/README.md`
- `x-pack/platform/plugins/shared/evals/server/routes/aesop/*.test.ts` (3 files)
- `x-pack/platform/plugins/shared/evals/server/lib/aesop/errors/aesop_errors.test.ts`
- `docs/AESOP_PRODUCTION_GAPS_ANALYSIS.md`

---

### Remaining Gaps (Optional)

**Not Blockers for Production:**

1. **RBAC** - Deferred per requirements (1-2 days effort)
2. **Drop LangSmith** - Deferred per requirements (4-6 hours effort)
3. **Full test coverage** - Basic tests added, comprehensive suite deferred (8-12 hours)
4. **Demo data polish** - Episode data loading (optional, synthetic data works)
5. **API documentation** - Swagger/OpenAPI specs (nice-to-have)

---

### Production Decision Matrix

| Criterion | Status | Blocker? |
|-----------|--------|----------|
| Code compiles | ⏳ Pending verification | 🔴 YES |
| Plugin initializes | ⏳ Pending verification | 🔴 YES |
| Routes accessible | ⏳ Pending verification | 🔴 YES |
| UI navigation works | ⏳ Pending verification | 🟡 MEDIUM |
| Agents create | ⏳ Pending verification | 🟢 NO (graceful degradation) |
| Workflows register | ⏳ Pending verification | 🟢 NO (API fallback works) |
| Tests pass | ⏳ Pending verification | 🟡 MEDIUM |
| E2E demo works | ⏳ Pending verification | 🟡 MEDIUM |

---

## Next Actions

**Immediate (next 30 minutes):**

1. Run validation checklist
2. Fix any critical issues found
3. Document validation results

**Before PR Merge:**

4. Create PR description with:
   - Summary of gaps filled
   - Before/after architecture
   - Validation results
   - Known limitations
   - Production roadmap

**After Merge:**

5. Create follow-up issues for deferred work (RBAC, LangSmith drop, full test coverage)

---

## Sign-Off Criteria

**Mark as "Production Ready" when:**
- [x] All critical gaps filled (integration, dependencies, navigation)
- [ ] All Phase 1-2 validation checks pass
- [ ] Zero compilation errors
- [ ] Zero critical runtime errors
- [ ] UI is accessible and functional
- [ ] API routes return valid responses

**Current Confidence:** 🟡 **80%** - Code integration complete, pending runtime validation

---

**Next:** Run bootstrap + type-check + unit tests to verify
