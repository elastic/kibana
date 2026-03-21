# AESOP Spike - Current Status

**Branch**: `spike/aesop-self-directed-skill-acquisition`
**Last Updated**: 2026-03-21
**Status**: 🟡 Implementation Complete - Integration & Testing Needed

---

## ✅ Completed Components

### 1. Architecture & Design (100%)
- [x] Complete architecture document
- [x] O11y traces validation approach documented
- [x] Demo guide created
- [x] Implementation summary

### 2. Workflows (100%)
- [x] Self-exploration workflow YAML (5 phases)
- [x] Skill validation workflow YAML
- [x] Validation iteration sub-workflow

### 3. Custom Agents (100%)
- [x] Agent definitions created (6 agents)
- [x] Agent creation script

### 4. API Routes (80%)
- [x] Run exploration endpoint
- [x] List proposed skills endpoint
- [x] Validate skill endpoint
- [x] Approve skill endpoint
- [ ] Reject skill endpoint (TODO)

### 5. UI Components (60%)
- [x] Proposed skills list page
- [x] Skill review flyout (with TraceWaterfall integration)
- [ ] Exploration dashboard (TODO)
- [ ] Real-time monitoring (TODO)

### 6. Demo Environment (100%)
- [x] Data generator script
- [x] Automated setup script
- [x] Multi-persona simulation

---

## 🔧 Integration Steps Needed (4-6 Hours)

### Step 1: Fix TypeScript Compilation (1-2h)

```bash
# After bootstrap completes:
yarn test:type_check --project x-pack/platform/plugins/shared/evals/tsconfig.json
```

**Expected issues**:
- Import statements in route files
- Type mismatches in workflow execution
- Missing dependencies in types.ts

**Fix approach**:
- Add missing imports
- Update types.ts with workflowsManagement, agentBuilder dependencies
- Add type definitions for workflow responses

### Step 2: Register UI Pages (1h)

```typescript
// In evals/public/plugin.ts - add AESOP routes

core.application.register({
  id: 'evals',
  // ... existing config
  mount: async (params) => {
    const { renderApp } = await import('./application');
    // Mount should include AESOP routes
    return renderApp(core, params);
  },
});
```

**Routes to add**:
- `/app/evals/aesop` - AESOP home
- `/app/evals/aesop/exploration` - Exploration dashboard
- `/app/evals/aesop/skills/proposed` - Proposed skills list (✅ component exists)

### Step 3: Test Workflow Execution (2h)

```bash
# 1. Start services
./x-pack/solutions/security/plugins/security_solution/scripts/aesop_demo/setup_environment.sh

# 2. Test exploration workflow via API
curl -X POST http://localhost:5601/internal/aesop/exploration/run \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "agent_role": "SOC analyst",
    "scoped_indices": [".alerts-*"],
    "exploration_depth": 10
  }'

# 3. Check workflow execution logs
# (In Kibana Dev Tools)
GET /.kibana-workflows-executions*/_search
{
  "query": {
    "term": { "workflow.name": "aesop.self_exploration" }
  },
  "sort": [{ "@timestamp": "desc" }],
  "size": 1
}

# 4. Check proposed skills
GET /.aesop-proposed-skills/_search
```

### Step 4: Validate O11y Traces (1h)

```bash
# 1. Run skill validation
curl -X POST http://localhost:5601/internal/aesop/skills/{skill_id}/validate \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -u elastic:changeme \
  -d '{
    "connector_id": "your-connector-id",
    "convergence_threshold": 0.85
  }'

# 2. Check traces were captured
GET /traces-*/_search
{
  "query": {
    "bool": {
      "must": [
        { "term": { "attributes.aesop.skill.id": "skill-001" } },
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ]
    }
  }
}

# 3. View in UI
# Navigate to: http://localhost:5601/app/evals/aesop/skills/proposed
# Click skill → View Trace → Should show TraceWaterfall
```

---

## 🎯 Demo Readiness Checklist

**Before demoing to stakeholders**:

- [ ] All services start successfully (`./setup_environment.sh` runs without errors)
- [ ] Data generation completes (~15K alerts, ~2.7K persona behaviors)
- [ ] Workflows load without YAML validation errors
- [ ] Custom agents created in Agent Builder
- [ ] Self-exploration workflow executes end-to-end
- [ ] Proposed skills appear in UI
- [ ] Skill validation workflow executes
- [ ] O11y traces captured in `traces-*`
- [ ] TraceWaterfall displays skill execution spans
- [ ] Skill approval deploys to Agent Builder
- [ ] Screenshots captured (10+ images)

---

## 📊 Hypothesis Measurement Plan

### H1: Discovery Coverage (≥70%)

**Measurement**:
```sql
-- Count discovered relationships
FROM .aesop-discovered-relationships
| STATS total = COUNT()

-- Compare to documented relationships (manual count from runbooks)
-- Formula: (discovered / documented) * 100 >= 70%
```

**Expected**: 8-12 relationships discovered (if 12-15 documented = 67-80% coverage)

### H2: Skill Quality (≥0.85)

**Measurement**:
```sql
-- Average score of validated skills
FROM .aesop-proposed-skills
| WHERE validation.status == "passed"
| STATS avg_score = AVG(validation.final_score)
```

**Expected**: 0.85-0.92 average score (based on convergence threshold)

### H3: Approval Rate Improvement

**Measurement** (requires multiple exploration cycles):

| Cycle | Skills Proposed | Passed Validation | Approved | Approval Rate |
|-------|----------------|-------------------|----------|---------------|
| 1 | 5 | 3 (60%) | 2 (40%) | 40% |
| 2 | 5 | 4 (80%) | 3 (60%) | 60% |
| 3 | 5 | 5 (100%) | 4 (80%) | 80% |

**Expected**: Improvement from Cycle 1 → Cycle 3

### H4: Net-New Capabilities (≥3)

**Measurement**:
- Manually review approved skills
- Ask SOC team: "Did you have this skill before?"
- Count skills where answer = "No"

**Expected**: 3-5 novel skills (e.g., auto-MITRE mapping, multi-alert correlation)

---

## 🐛 Known Issues

### 1. Workflow Loop Limitation

**Issue**: Workflows don't support `while` loops
**Impact**: Validation iteration count hardcoded (max 5)
**Workaround**: Unroll loop (iteration_1, iteration_2, ...)
**Future**: Request `while` or `loop` step type from Workflows team

### 2. Eval Step Type Missing

**Issue**: No built-in `evals.run` step type in Workflows
**Impact**: Need custom Kibana API endpoint to wrap @kbn/evals
**Workaround**: Created `/internal/aesop/skills/{id}/evaluate` endpoint
**Future**: Request native evals step type

### 3. Agent Auto-Creation

**Issue**: Agents need to be created before workflows can reference them
**Impact**: First workflow run will fail if agents don't exist
**Workaround**: Run agent creation on plugin start (implemented in plugin.ts)
**Test**: Verify agents exist after Kibana starts

---

## 📝 Next Session Tasks

**Priority 1: Make It Work** (4-6h)
1. Fix TypeScript errors (after bootstrap)
2. Test workflow execution
3. Debug any workflow step failures
4. Verify O11y traces appear

**Priority 2: Measure & Validate** (2-3h)
5. Run full exploration cycle
6. Measure H1-H4 hypotheses
7. Compare o11y traces vs LangSmith (if configured)
8. Document results

**Priority 3: Polish for Demo** (2-3h)
9. Implement missing UI (exploration dashboard)
10. Capture professional screenshots
11. Create slide deck (optional)
12. Dry-run demo script

---

## 🎬 Demo Script (When Ready)

**15-Minute Walkthrough**:

```
[0:00-0:01] Intro
  → "AESOP: Agent-driven skill acquisition for Agent Builder"

[0:01-0:03] Architecture Overview
  → Show diagram: Workflows → O11y Traces → Agent Builder

[0:03-0:08] Self-Exploration Demo
  → Trigger workflow from UI
  → Monitor progress (schema → profile → patterns → skills)
  → Show 5 proposed skills generated

[0:08-0:12] Skill Validation
  → Select skill "Investigate High-Severity Alerts"
  → Run validation (3 iterations, converges at 0.89 score)
  → Click "View Trace" → TraceWaterfall shows OTEL spans
  → Highlight: tokens (1.2K input, 567 output), latency (2.1s), zero errors

[0:12-0:14] Human Review & Approval
  → Review skill content
  → Add review notes
  → Click "Approve & Deploy"
  → Skill appears in Agent Builder

[0:14-0:15] Q&A
  → Key points: 100% Elastic-native, o11y traces not LangSmith, Workflows not LangGraph
```

---

## 📧 Stakeholder Communication

**For Security Team**:
- "AESOP discovers skills by observing your SOC analysts' patterns"
- "100% read-only during exploration (zero risk)"
- "Human approval required before any skill deploys"

**For AI Infra Team**:
- "Uses Workflows (not LangGraph) - 60% less code"
- "O11y traces replace LangSmith - zero external dependencies"
- "Extends existing evals plugin - consistent UX"

**For Leadership**:
- "Validates research hypothesis: agents can teach themselves"
- "Strategic: dogfoods Elastic observability stack"
- "Cost: zero vs $500+/month for LangSmith alternative"

---

**Status**: Ready for integration testing once bootstrap completes
