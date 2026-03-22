# AESOP PoC - Production Readiness Gap Analysis

**Date:** 2026-03-22
**Branch:** `spike/aesop-spike`
**Analyst:** Claude Sonnet 4.5 (spike-builder)
**Status:** 🟡 **PARTIALLY READY** - Critical integration gaps identified

---

## Executive Summary

The AESOP implementation is **architecturally complete** (~35 files, ~4,200 lines of code) but has **critical integration gaps** that prevent it from being functional. The code exists but isn't wired up to the plugin lifecycle.

**Current State:**
- ✅ Implementation: 95% complete (all routes, agents, workflows, UI components exist)
- ❌ Integration: 30% complete (not registered in plugin, missing dependencies)
- ❌ Testing: 15% complete (only 1 test file exists)
- ❌ Dependencies: Missing `@kbn/llm-batch-processing` package implementation

**Time to Production Ready:** 2-3 days of focused work

---

## Critical Gaps (Blockers)

### Gap 1: Plugin Integration ✅ **FIXED**

**Issue:** AESOP routes and agents not registered in plugin lifecycle

**Impact:** AESOP endpoints return 404, agents don't exist, feature is completely non-functional

**Status:** ✅ **FIXED IN THIS SESSION**

**Changes Made:**
1. Updated `plugin.ts`:
   - Added AESOP routes registration in `setup()` method
   - Added agent auto-creation in `start()` method (with graceful degradation)
2. Updated `types.ts`:
   - Added `agentBuilder` to setup/start dependencies (optional)

**Files Modified:**
- `x-pack/platform/plugins/shared/evals/server/plugin.ts` (added 20 lines)
- `x-pack/platform/plugins/shared/evals/server/types.ts` (added 2 lines)

**Verification Needed:**
```bash
# After Kibana restart, verify routes are registered:
curl -u elastic:changeme "http://localhost:5601/internal/aesop/skills/proposed"
# Should return: {"skills": []} (not 404)
```

---

### Gap 2: @kbn/llm-batch-processing Package Missing ⚠️ **HIGH PRIORITY**

**Issue:** Package structure exists but has no source code

**Impact:** Any code that imports from `@kbn/llm-batch-processing` will fail to compile

**Current State:**
- ✅ Package scaffold exists (`package.json`, `tsconfig.json`, `jest.config.js`)
- ❌ No `src/` directory
- ❌ No implementation files

**What's Missing:**
```
x-pack/platform/packages/shared/kbn-llm-batch-processing/
  src/
    index.ts              # Public API exports
    types.ts              # TypeScript interfaces
    orchestrator.ts       # Main batchProcess() function
    split.ts              # Token-based and item-based splitting
    merge.ts              # Hierarchical merge logic
  __tests__/
    orchestrator.test.ts  # Unit tests
  README.md               # Documentation
```

**Historical Context:**
- This package was implemented in commits `e1efa3eb` through `585b6184`
- It provides batch processing utilities for LLM workloads (extracted from Attack Discovery)
- Originally created to handle large-scale LLM operations that exceed context windows

**Resolution:**
1. **Option A (Recommended):** Extract from git history
   ```bash
   # Restore all llm-batch-processing files from commit 585b6184
   git show 585b6184:x-pack/platform/packages/shared/kbn-llm-batch-processing/src/index.ts > \
     x-pack/platform/packages/shared/kbn-llm-batch-processing/src/index.ts

   # Repeat for types.ts, orchestrator.ts, split.ts, merge.ts
   ```

2. **Option B:** Re-implement from README specification (2-3 hours)
   - README exists in git history (commit `585b6184`)
   - Clear API specification documented
   - Low risk (well-defined scope)

**Urgency:** HIGH - Required for AESOP to compile and run

---

### Gap 3: Workflow Registration Missing ⚠️ **MEDIUM PRIORITY**

**Issue:** Workflows defined but not loaded by Kibana Workflows plugin

**Impact:** Exploration and validation workflows can't be triggered

**Current State:**
- ✅ Workflow YAML files exist:
  - `server/workflows/aesop/self_exploration.yaml` (~200 lines)
  - `server/workflows/aesop/skill_validation.yaml` (~100 lines)
  - `server/workflows/aesop/skill_validation_iteration.yaml` (~150 lines)
- ❌ Not registered in plugin lifecycle

**Resolution:**
Add to `plugin.ts` setup():
```typescript
// Register AESOP workflows
if (plugins.workflows) {
  try {
    const workflowsPath = path.join(__dirname, 'workflows', 'aesop');
    await plugins.workflows.registerWorkflowsFromDirectory(workflowsPath);
    this.logger.info('AESOP workflows registered successfully');
  } catch (error) {
    this.logger.warn(`Failed to register AESOP workflows: ${error.message}`);
  }
}
```

**Files to Modify:**
- `x-pack/platform/plugins/shared/evals/server/plugin.ts`
- `x-pack/platform/plugins/shared/evals/server/types.ts` (add `workflows` dependency)

**Urgency:** MEDIUM - Needed for E2E demo, but workflows can be triggered manually via API as workaround

---

### Gap 4: UI Navigation Missing ⚠️ **MEDIUM PRIORITY**

**Issue:** AESOP pages exist but not accessible via Kibana UI

**Impact:** Users must navigate directly to URLs (no menu links)

**Current State:**
- ✅ React components exist:
  - `public/pages/aesop/proposed_skills_list.tsx` (full page)
  - `public/pages/aesop/exploration_dashboard.tsx` (full page)
  - `public/pages/aesop/components/skill_review_flyout.tsx` (modal)
- ❌ No routing configuration
- ❌ No sidebar navigation

**Resolution:**
Add to `public/plugin.ts`:
```typescript
// Register AESOP routes
application.register({
  id: 'evals:aesop',
  title: 'AESOP',
  mount: async (params: AppMountParameters) => {
    const { renderApp } = await import('./pages/aesop/mount');
    return renderApp(params);
  },
});

// Add to sidebar
navigation.addLink({
  id: 'aesop-skills',
  title: 'Proposed Skills',
  href: '/app/evals/aesop/skills/proposed',
  parentId: 'evals',
});

navigation.addLink({
  id: 'aesop-exploration',
  title: 'Exploration Dashboard',
  href: '/app/evals/aesop/exploration',
  parentId: 'evals',
});
```

**Files to Create:**
- `x-pack/platform/plugins/shared/evals/public/pages/aesop/mount.tsx` (React Router setup)

**Urgency:** MEDIUM - Demo can work with direct URLs, but poor UX

---

## High-Priority Gaps (Not Blockers)

### Gap 5: Test Coverage Insufficient ⚠️

**Issue:** Only 1 test file exists (`run_exploration.test.ts`)

**Impact:** No confidence in code quality, bugs will surface in production

**Current Coverage:**
- Routes: 1/5 tested (20%)
- Lib modules: 0/5 tested (0%)
- UI components: 0/3 tested (0%)

**What's Missing:**
```
server/routes/aesop/
  approve_skill.test.ts
  reject_skill.test.ts
  list_proposed_skills.test.ts
  run_skill_validation.test.ts

server/lib/aesop/
  agents/create_aesop_agents.test.ts
  caching/exploration_cache.test.ts
  errors/aesop_errors.test.ts
  versioning/skill_versioning.test.ts

public/pages/aesop/
  proposed_skills_list.test.tsx
  exploration_dashboard.test.tsx
  components/skill_review_flyout.test.tsx
```

**Resolution:**
- **Option A:** Write comprehensive test suite (8-12 hours)
- **Option B:** Prioritize critical paths only (4-6 hours):
  - Routes: Happy path + error handling
  - Error classes: All custom errors
  - UI: Smoke tests only

**Urgency:** HIGH for production, MEDIUM for demo

---

### Gap 6: Dependencies Not Declared 🔴 **BLOCKER**

**Issue:** Plugin imports from `@kbn/agent-builder-plugin` but doesn't declare dependency

**Impact:** Type errors, undefined at runtime

**Current State:**
- `create_aesop_agents.ts` imports `AgentBuilderPluginSetup` from `@kbn/agent-builder-plugin/server`
- `kibana.jsonc` does NOT list `agentBuilder` in `requiredPlugins` or `optionalPlugins`

**Resolution:**
Update `x-pack/platform/plugins/shared/evals/kibana.jsonc`:
```json
{
  "id": "evals",
  "optionalPlugins": [
    "agentBuilder",
    "workflows"
  ]
}
```

**Urgency:** 🔴 **CRITICAL** - Must fix before Kibana starts, or plugin will crash

---

## Medium-Priority Gaps

### Gap 7: Demo Data Scripts Incomplete

**Current State:**
- ✅ `setup_environment.sh` exists (sets up ES + EDOT + Kibana)
- ✅ `data_generator.ts` exists (generates synthetic alerts, personas, etc.)
- ⚠️ `load_episode_data.sh` references ep1-ep8 episodes but episodes don't exist in repo

**Resolution:**
- **Option A:** Create synthetic episodes (matches paper scenarios) - 2-4 hours
- **Option B:** Use existing `data_generator.ts` only - 0 hours (already works)

**Recommendation:** Option B for demo, Option A if validating against specific attack patterns

---

### Gap 8: Documentation Gaps

**What Exists:**
- ✅ `aesop_poc_architecture.md` (50+ pages, comprehensive)
- ✅ `aesop_o11y_traces_validation.md` (LangSmith parity analysis)
- ✅ `aesop_demo_guide.md` (step-by-step demo)
- ✅ `aesop_implementation_summary.md` (status summary)

**What's Missing:**
- ❌ API reference documentation (Swagger/OpenAPI)
- ❌ Deployment guide (how to enable in production)
- ❌ Troubleshooting guide (common errors + fixes)
- ❌ Developer onboarding guide (how to contribute)

**Urgency:** LOW for PoC, MEDIUM for production

---

## Production Hardening Gaps (Deferred)

**Per AESOP_PRODUCTION_COMPLETE.md, these were explicitly deferred:**

### Deferred 1: RBAC (Role-Based Access Control)

**Current State:** All AESOP routes use `internal` access (no privilege checks)

**Production Requirement:**
- Viewer: Can view proposed skills, exploration history (read-only)
- Editor: Can trigger exploration, approve/reject skills (read-write)
- Admin: Can configure AESOP settings, manage workflows (full control)

**Effort:** 1-2 days

---

### Deferred 2: Drop LangSmith Dependency

**Current State:** Code references LangSmith for cross-validation (not implemented yet)

**Production Requirement:** Remove all LangSmith imports, use only O11y traces

**Effort:** 4-6 hours (find-and-replace + test)

---

## Implementation Priority

### Phase 1: Critical Blockers (4-6 hours)

1. ✅ **DONE** - Register AESOP routes in plugin.ts
2. ✅ **DONE** - Add agent auto-creation in plugin.ts
3. 🔴 **TODO** - Implement @kbn/llm-batch-processing package (2-3 hours)
4. 🔴 **TODO** - Declare dependencies in kibana.jsonc (5 min)

### Phase 2: High Priority (6-8 hours)

5. Register workflows in plugin lifecycle (1 hour)
6. Add UI navigation (2-3 hours)
7. Critical path testing (3-4 hours)

### Phase 3: Polish (4-6 hours)

8. Full test coverage (if time permits)
9. Demo data improvements
10. Documentation polish

---

## Validation Checklist

**Before marking "production-ready":**

- [ ] `yarn kbn bootstrap` completes without errors
- [ ] TypeScript compiles: `yarn type-check --project x-pack/platform/plugins/shared/evals/tsconfig.json`
- [ ] ESLint passes: `yarn lint --fix x-pack/platform/plugins/shared/evals/**/*.ts`
- [ ] Unit tests pass: `yarn test:jest x-pack/platform/plugins/shared/evals/`
- [ ] Kibana starts successfully
- [ ] AESOP routes accessible: `curl http://localhost:5601/internal/aesop/skills/proposed`
- [ ] UI navigation works: Navigate to `/app/evals/aesop/skills/proposed`
- [ ] Agents auto-created: Check Kibana logs for "AESOP agents created successfully"
- [ ] Workflows loadable: Check logs for "AESOP workflows registered"
- [ ] Demo script runs: Execute full 15-minute demo without errors

---

## Recommended Action Plan

**For Production Shipment:**

**Day 1 (Morning):**
- [ ] Implement @kbn/llm-batch-processing package (restore from git history)
- [ ] Declare agentBuilder + workflows dependencies in kibana.jsonc
- [ ] Verify TypeScript compiles and tests pass

**Day 1 (Afternoon):**
- [ ] Register workflows in plugin lifecycle
- [ ] Add UI navigation and routing
- [ ] Test E2E demo flow

**Day 2 (Morning):**
- [ ] Write critical path tests (routes + error handling)
- [ ] Fix any bugs discovered during testing

**Day 2 (Afternoon):**
- [ ] Final validation checklist
- [ ] Documentation polish (deployment guide, troubleshooting)
- [ ] Create PR for review

**Total Effort:** ~2 days (16 hours)

---

## Immediate Next Steps

**Right now (next 10 minutes):**

1. Extract `@kbn/llm-batch-processing` from git history:
   ```bash
   mkdir -p x-pack/platform/packages/shared/kbn-llm-batch-processing/src

   for file in index.ts types.ts orchestrator.ts split.ts merge.ts; do
     git show 585b6184:x-pack/platform/packages/shared/kbn-llm-batch-processing/src/$file > \
       x-pack/platform/packages/shared/kbn-llm-batch-processing/src/$file
   done

   git show 585b6184:x-pack/platform/packages/shared/kbn-llm-batch-processing/README.md > \
     x-pack/platform/packages/shared/kbn-llm-batch-processing/README.md
   ```

2. Update `kibana.jsonc`:
   ```bash
   # Add to optionalPlugins: ["agentBuilder", "workflows"]
   ```

3. Run bootstrap and verify compilation:
   ```bash
   yarn kbn bootstrap
   yarn type-check --project x-pack/platform/plugins/shared/evals/tsconfig.json
   ```

**If all green:** Move to Phase 2 (workflows + UI navigation)

---

## Success Criteria

**PoC Demo Ready:**
- ✅ All code compiles
- ✅ Kibana starts without errors
- ✅ Can trigger exploration via API
- ✅ Can view proposed skills via UI
- ✅ Can approve/reject skills via UI
- ✅ O11y traces appear in Elasticsearch
- ⚠️ Workflows execute successfully (90% confidence needed)

**Production Ready (Future):**
- ✅ All above + comprehensive test coverage (>80%)
- ✅ RBAC implemented
- ✅ LangSmith dependency removed
- ✅ Security review completed
- ✅ Performance benchmarks met (<2 hours exploration, <30 min validation)

---

## Conclusion

**Current Status:** 🟡 **70% Ready**

**Blockers Remaining:** 2 (llm-batch-processing package, dependencies declaration)

**Time to Demo-Ready:** 4-6 hours

**Time to Production-Ready:** 2-3 days

**Risk Level:** 🟢 **LOW** - All gaps are well-defined and straightforward to fix

---

**Next Action:** Execute immediate next steps (restore llm-batch-processing from git history)
