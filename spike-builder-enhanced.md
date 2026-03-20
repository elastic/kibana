---
name: spike-builder
description: >
  Autonomous full-lifecycle spike/PoC orchestrator with competitive analysis, overlap detection, and E2E delivery.
  Handles discovery, planning, implementation, testing, and documentation. Recognizes existing spikes and fills gaps.
  Fully autonomous - handles server setup, data loading, demo scripts, and validation workflows.
trigger: |
  - "build a spike for X"
  - "create a PoC for X"
  - "prototype X with feature flag"
  - "spike implementation for X"
  - "continue spike for X"
  - "complete spike for X"
examples:
  - input: "Build a spike for vulnerability checker rule type in Security Solution"
    output: "Performs competitive analysis (Splunk/CrowdStrike approaches), searches for overlapping Kibana work, identifies blockers, generates risk analysis report, creates feature branch, scaffolds feature flag, implements E2E (API → processing → UI), adds comprehensive tests, auto-starts Kibana, generates demo scripts and manual validation workflows, captures screenshots, writes technical docs"
  - input: "Continue spike for Endpoint Compliance Monitoring with EPSS scoring"
    output: "Detects existing spike state (Phase 3 partial implementation), identifies gaps (missing UI tests, no feature flag, incomplete docs), fills gaps autonomously, generates demo scripts and validation workflows"
---

# @spike-builder

**Purpose:** Autonomous orchestrator for full-lifecycle spike/PoC development from competitive analysis to E2E delivery. Ensures spikes are production-ready, comprehensively tested, properly documented, and coordinated across teams. Handles everything autonomously - no manual setup required.

**Philosophy:**
- **Discovery-first:** Understand competitive landscape and avoid duplication before coding
- **Autonomous:** Handle all setup (servers, data, demo scripts) without user intervention
- **Production-ready:** Spikes should be merge-ready, not throwaway experiments
- **E2E completeness:** Backend API → Processing logic → UI components (full stack)
- **Test coverage:** Unit, integration, Scout E2E + automated demo scripts
- **Feature-flagged:** Safe to merge, easy to enable/disable
- **Cross-team coordination:** Identify dependencies and stakeholders upfront

---

## When to Use

**Automatic activation triggers:**
- User mentions "spike", "PoC", "proof of concept", "prototype"
- User asks to "explore", "validate", or "continue" a feature/spike
- User wants to "build a demo" or "test an idea"
- User mentions "continue spike" or "complete spike"

**Manual invocation:**
```
/spike-builder
```

---

## Core Workflow

### Phase 0: Discovery & Analysis (30-60 min) 🔍

**Goal:** Understand competitive landscape, detect overlapping work, identify blockers, and assess risks BEFORE writing code.

---

#### Step 0.1: Detect Existing Spike State (5 min)

**Purpose:** Recognize if spike work already exists and assess current state.

**Detection checklist:**

```bash
# 1. Check for spike branch
git branch -a | grep -i "spike/<feature-name>"

# 2. Search for feature flag
grep -r "<plugin>:<feature>_enabled" x-pack/plugins/<plugin>/

# 3. Search for spike docs
find docs/ -name "*<feature>*spike*.md"

# 4. Search for feature code
grep -r "<feature>" x-pack/plugins/<plugin>/server/
grep -r "<feature>" x-pack/plugins/<plugin>/public/

# 5. Check for tests
find x-pack/plugins/<plugin>/test -name "*<feature>*"
```

**State assessment matrix:**

| Component | Status | Gap |
|-----------|--------|-----|
| Feature branch | ✅ Exists / ❌ Missing | Create branch |
| Feature flag | ✅ Exists / ⚠️ Partial / ❌ Missing | Add/complete flag |
| Backend API | ✅ Complete / ⚠️ Partial / ❌ Missing | Implement/complete API |
| Processing logic | ✅ Complete / ⚠️ Partial / ❌ Missing | Implement/complete logic |
| UI components | ✅ Complete / ⚠️ Partial / ❌ Missing | Implement/complete UI |
| Unit tests | ✅ Complete / ⚠️ Partial / ❌ Missing | Add/complete tests |
| Integration tests | ✅ Complete / ⚠️ Partial / ❌ Missing | Add/complete tests |
| Scout E2E tests | ✅ Complete / ⚠️ Partial / ❌ Missing | Add/complete tests |
| Demo scripts | ✅ Exists / ❌ Missing | Generate scripts |
| Documentation | ✅ Complete / ⚠️ Partial / ❌ Missing | Write/complete docs |
| Screenshots | ✅ Exists / ❌ Missing | Capture screenshots |

**Output:** Current state summary + gaps to fill

**Decision:**
- If spike is **0-20% complete** → Start from beginning (Phase 0.2+)
- If spike is **20-80% complete** → Fill gaps (jump to missing phases)
- If spike is **80-100% complete** → Polish and validate (Phase 5+)

---

#### Step 0.2: Competitive Analysis (15-20 min)

**Purpose:** Understand what competitors do well and assess fit with Elastic's offering.

**Competitors to analyze:**
- **SIEM/Security:** Splunk, CrowdStrike, Palo Alto Cortex XSOAR, Microsoft Sentinel
- **Observability:** Datadog, New Relic, Dynatrace
- **General:** Relevant SaaS products in the feature domain

**Research sources:**
1. **Web search:** `"<feature> <competitor>" site:docs.<competitor>.com`
2. **YouTube demos:** `"<competitor> <feature> demo"`
3. **Documentation:** Competitor docs, API references
4. **Community:** Reddit, Twitter/X, HackerNews discussions

**Analysis template:**

```markdown
## Competitive Analysis

### Splunk: <Feature Name>

**What they do well:**
- [Specific capability 1] - [Why it's good]
- [Specific capability 2] - [Why it's good]
- [Specific capability 3] - [Why it's good]

**Fit with Elastic:**
- ✅ **Strong fit:** [Capability that aligns well with Elastic's strengths]
- ⚠️ **Medium fit:** [Capability that requires adaptation]
- ❌ **Poor fit:** [Capability that conflicts with Elastic's architecture]

**Key insights:**
- [Learning 1]
- [Learning 2]

**Screenshots/Videos:**
- [Link to demo]
- [Link to docs]

---

### CrowdStrike: <Feature Name>

[Same structure as above]

---

### Microsoft Sentinel: <Feature Name>

[Same structure as above]

---

## Competitive Summary

**Best practices to adopt:**
1. [Practice 1 from Competitor X] - [Why adopt]
2. [Practice 2 from Competitor Y] - [Why adopt]
3. [Practice 3 from Competitor Z] - [Why adopt]

**Anti-patterns to avoid:**
1. [Anti-pattern 1] - [Why avoid]
2. [Anti-pattern 2] - [Why avoid]

**Differentiation opportunities:**
- [How Elastic can do it better/differently]
- [Unique value proposition]
```

---

#### Step 0.3: Kibana Overlap Detection (10-15 min)

**Purpose:** Detect overlapping work in Kibana to avoid duplication and coordinate efforts.

**Search strategy:**

```bash
# 1. GitHub Issues search
gh issue list --repo elastic/kibana --search "<feature> in:title,body" \
  --limit 50 --json number,title,state,author,labels,url

gh issue list --repo elastic/security-team --search "<feature> in:title,body" \
  --limit 50 --json number,title,state,author,labels,url

# 2. GitHub PRs search
gh pr list --repo elastic/kibana --search "<feature> in:title,body" \
  --limit 50 --json number,title,state,author,labels,url

# 3. Code search (existing implementation)
gh api /search/code \
  --method GET \
  --field q="<feature> repo:elastic/kibana language:typescript" \
  --jq '.items[] | {path, url}'

# 4. Related work keywords
# Search for: "<feature>", "similar to <feature>", "<feature-synonym>"
```

**Overlap analysis matrix:**

| Type | Title | Status | Author | Overlap % | Action |
|------|-------|--------|--------|-----------|--------|
| Issue | [#12345 - Similar Feature] | Open | @user | 80% | 🔴 **BLOCKER:** Coordinate before starting |
| PR | [#12346 - Related Work] | Open | @user | 40% | 🟡 **WATCH:** May conflict, sync regularly |
| Code | `x-pack/.../feature.ts` | Merged | @user | 20% | 🟢 **REUSE:** Leverage existing patterns |

**Overlap severity:**
- 🔴 **80-100% overlap:** Hard blocker - must coordinate or abandon
- 🟡 **40-79% overlap:** Soft blocker - sync regularly, watch for conflicts
- 🟢 **10-39% overlap:** Reuse opportunity - adopt patterns, reference work
- ⚪ **0-9% overlap:** No concern - independent work

---

#### Step 0.4: Blocker & Dependency Identification (10 min)

**Purpose:** Identify hard/soft blockers and dependencies before implementation.

**Blocker types:**

1. **Hard blockers (MUST resolve before starting):**
   - API/framework not available (e.g., Attachments V2 not merged)
   - Required service not deployed
   - Breaking architectural change in progress

2. **Soft blockers (can work around, but less ideal):**
   - Preferred API not stable (can use legacy workaround)
   - Related feature not ready (can build in parallel)
   - Documentation missing (can infer from code)

3. **Dependencies (need to coordinate):**
   - Another team building related feature
   - Shared infrastructure changes
   - Cross-plugin integration required

**Blocker detection queries:**

```bash
# 1. Search for "blocked by" or "depends on" in issues
gh issue list --repo elastic/kibana \
  --search "\"blocked by\" <feature> OR \"depends on\" <feature>" \
  --limit 20 --json number,title,body,url

# 2. Search for feature flags (indicates experimental/unstable)
grep -r "feature.*flag.*<feature>" x-pack/plugins/

# 3. Search for TODO/FIXME related to feature
grep -r "TODO.*<feature>\|FIXME.*<feature>" x-pack/

# 4. Check for ongoing migrations
gh pr list --repo elastic/kibana \
  --search "migration <related-area> is:open" \
  --limit 10 --json number,title,url
```

---

#### Step 0.5: Cross-Team Coordination (5-10 min)

**Purpose:** Identify who to reach out to for coordination.

**Stakeholder mapping:**

```markdown
## Cross-Team Coordination

### Teams to Notify

| Team | Contact | Reason | When to Reach Out |
|------|---------|--------|-------------------|
| Cases | @christineweng | Attachments V2 timeline | Week 1 (before Task 1C) |
| ResponseOps | @janmonschke | Workflow triggers timeline | Week 2 (before Task 2B) |
| Entity Analytics | @entity-team | Maintainers Framework support | Week 3 (before Task 2A) |
| Security Solution | @security-team | Feature alignment | Week 1 (kickoff) |

### Slack Channels to Monitor

- `#security-solution-dev` - Feature discussions
- `#kibana-cases` - Cases API changes
- `#response-ops` - Alerting V2 updates
- `#entity-analytics` - Entity framework changes

### Meeting Requests

- [ ] Sync with Cases team (week 1) - Confirm Attachments V2 timeline
- [ ] Sync with ResponseOps (week 2) - Workflow triggers readiness
- [ ] Entity Analytics office hours (week 3) - Maintainers pattern review
```

---

#### Step 0.6: Risk Analysis (10 min)

**Purpose:** Assess technical, timeline, and coordination risks.

**Risk categories:**

```markdown
## Risk Analysis

### 🔴 High Risks (>50% chance, high impact)

#### Risk 1: [Blocker X may not resolve in time]
- **Probability:** 60%
- **Impact:** Delays Task Y by 2-3 weeks
- **Mitigation:** Build fallback implementation using legacy API; refactor when blocker resolves
- **Migration effort if fallback:** ~3-5 days (rewrite API integration layer)
- **Decision point:** Week 2 - if blocker not resolved, switch to fallback

#### Risk 2: [Cross-team dependency on Team Z]
- **Probability:** 40%
- **Impact:** Cannot complete Task W without Team Z's API
- **Mitigation:** Parallel track - build abstraction layer, mock Team Z's API
- **Coordination:** Weekly sync with Team Z starting week 1

---

### 🟡 Medium Risks (20-50% chance, medium impact)

#### Risk 3: [Performance may not meet target]
- **Probability:** 30%
- **Impact:** May need performance optimization iteration (+1 week)
- **Mitigation:** Early performance testing in week 3; fallback to simpler algorithm if needed

---

### 🟢 Low Risks (<20% chance, low impact)

#### Risk 4: [UI complexity may increase]
- **Probability:** 15%
- **Impact:** Extra 2-3 days for UI polish
- **Mitigation:** Use EUI patterns consistently; defer advanced UI to follow-up

---

## Risk Mitigation Strategy

**Week 1:**
- [ ] Reach out to Teams X, Y, Z to confirm timelines
- [ ] Prototype performance-critical path to validate approach
- [ ] Set up abstraction layers for blockers

**Week 2:**
- [ ] Decision point: Switch to fallback if Blocker X not resolved
- [ ] Early integration testing with Team Z's API

**Week 3:**
- [ ] Performance benchmark run
- [ ] Escalate if any high risk materializes
```

---

#### Step 0.7: Discovery Report Generation (10 min)

**Purpose:** Generate comprehensive discovery report in the GitHub issue format.

**Report structure:**

```markdown
# <Feature Name> Spike - Discovery Report

**Author:** [Your Name]
**Date:** [YYYY-MM-DD]
**Status:** Discovery Complete → Ready for Implementation

---

## Executive Summary

[2-3 sentences: What we're building, why, and key findings from discovery]

**Key findings:**
- ✅ [Positive finding 1]
- ⚠️ [Risk/blocker identified]
- 🔴 [Critical blocker or decision needed]

---

## Competitive Analysis

[From Step 0.2]

### Splunk: <Feature>
**What they do well:**
- [...]

**Fit with Elastic:**
- ✅ [...]
- ⚠️ [...]

---

### CrowdStrike: <Feature>
[...]

---

## Competitive Summary

**Best practices to adopt:**
1. [...]

**Differentiation opportunities:**
- [...]

---

## Overlap Detection

### Overlapping Work Found

| Type | Title | Status | Author | Overlap | Risk |
|------|-------|--------|--------|---------|------|
| Issue | [#12345 - Similar Feature] | Open | @user | 80% | 🔴 High |
| PR | [#12346 - Related Work] | Merged | @user | 20% | 🟢 Low |

### Risk Assessment

**🔴 High Overlap (80%): Issue #12345**
- **Action required:** Coordinate with @user before starting
- **Recommendation:** Either merge efforts or clearly delineate scope

**🟢 Low Overlap (20%): PR #12346**
- **Action:** Reuse patterns from merged PR
- **Files to review:** `x-pack/.../feature.ts`

---

## Blocker Summary

### Hard Blockers

| Blocker | Type | Affects | Severity | Recommended | Fallback | Migration Effort |
|---------|------|---------|----------|-------------|----------|------------------|
| [#256133] Attachments V2 | Hard | Task 1C | 🔴 High | Wait for V2 API | Build with V1 legacy API | ~2-3 days |

**[#256133] Attachments V2 - Detail:**
- **Recommended:** Wait for `registerUnified()` API to stabilize
- **Fallback:** Use legacy `registerExternalReference()`
- **Migration effort if fallback:** ~2-3 days (re-register, change payload shape, dual-read logic for existing attachments)
- **Migration risk:** Medium (V2 schema simpler, but data migration needed)

---

### Soft Blockers

| Blocker | Type | Affects | Severity | Recommended | Fallback | Migration Effort |
|---------|------|---------|----------|-------------|----------|------------------|
| [#257284] Workflow Triggers | Soft | Task 2B | 🟡 Medium | Use workflow triggers | Custom hook in Cases flow | ~3-5 days |

**[#257284] Workflow Triggers - Detail:**
- **Recommended:** Use Cases workflow triggers for AD events
- **Fallback:** Build custom hook in Cases attachment flow
- **Migration effort if fallback:** ~3-5 days (remove hook, register trigger handler, test configs)
- **Migration risk:** Medium-High (custom hook couples to Cases internals, may break on refactor)

---

### Strategic Considerations

| Item | Type | Affects | Severity | Recommended | Migration Effort |
|------|------|---------|----------|-------------|------------------|
| [#247464] Alerting V2 | Strategic | All alert queries | 🔴 High | Build on V1 with abstraction layer | ~1-2 weeks |

**[#247464] Alerting V2 - Detail:**
- **Context:** Complete alerting rewrite (episodes vs individual alerts)
- **Recommended:** Build on V1 alerting APIs with abstraction layer
- **Migration effort if on V1:** ~1-2 weeks (rewrite queries to ES|QL, adapt to episode lifecycle, change trigger configs)
- **Migration risk:** Medium (V2 behind feature flag, unlikely to ship soon; abstraction layer bounds migration scope)
- **Action:** Monitor weekly for V2 progress

---

## Cross-Team Coordination

### Teams to Contact

| Team | Contact | Reason | When | Status |
|------|---------|--------|------|--------|
| Cases | @christineweng | Attachments V2 timeline | Week 1 | ⏳ Pending |
| ResponseOps | @janmonschke | Workflow triggers readiness | Week 2 | ⏳ Pending |
| Entity Analytics | @entity-team | Maintainers Framework support | Week 3 | ⏳ Pending |

### Communication Plan

**Week 1:**
- [ ] Slack message to #kibana-cases: "Starting <feature> spike, need Attachments V2 timeline"
- [ ] Meeting request with @christineweng (30 min)
- [ ] Post in #security-solution-dev: "<feature> spike starting, coordination needed"

**Week 2:**
- [ ] Sync with @janmonschke on workflow triggers
- [ ] Decision point: Switch to fallback if Attachments V2 timeline unclear

---

## Risk Analysis

### 🔴 High Risks

**Risk 1: Attachments V2 timeline uncertainty**
- **Probability:** 60%
- **Impact:** Delays Task 1C by 2-3 weeks
- **Mitigation:** Build with V1 API, migrate to V2 when available (~2-3 days migration)
- **Decision point:** Week 2

---

### 🟡 Medium Risks

**Risk 2: Workflow triggers not ready**
- **Probability:** 40%
- **Impact:** Task 2B uses suboptimal hook approach
- **Mitigation:** Build custom hook, refactor to triggers later (~3-5 days migration)

---

### 🟢 Low Risks

**Risk 3: Performance optimization needed**
- **Probability:** 20%
- **Impact:** +1 week for optimization
- **Mitigation:** Early performance testing in week 3

---

## Implementation Plan

### Timeline

```
Week  1-2:   ▓▓ Task 0A: Entity Extraction Engine
             ▓▓ Task 0C: Case-Scoped AD
             ░░ Task 0B: Batched AD starts
             📞 Contact @christineweng re: Attachments V2

Week  3-4:   ▓▓ Task 0B: Batched AD completes
             ▓▓ Task 1A: Case Matching starts
             ▓▓ Task 1C: AD Attachment Type (if #256133 merged)
             📞 Contact @janmonschke re: workflow triggers

Week  5-6:   ▓▓ Task 1A: Case Matching completes
             ▓▓ Task 1B: Incremental AD
             ▓▓ Task 2B: Auto AD Trigger (if #257284 merged)

Week  7-8:   ▓▓ Task 2A: Scheduled Grouping Workflow
             ▓▓ Task 2C: Case Enrichment

Week  9-10:  ▓▓ Integration testing, QA, docs
```

---

## Next Steps

**Immediate (this week):**
1. [ ] Reach out to Cases team (@christineweng) - Attachments V2 timeline
2. [ ] Post coordination message in #security-solution-dev
3. [ ] Create feature branch: `spike/<feature-name>`
4. [ ] Set up abstraction layer for Attachments API (prepare for V1/V2 migration)

**Week 2:**
5. [ ] Decision point: V1 fallback if Attachments V2 not ready
6. [ ] Sync with ResponseOps (@janmonschke) - workflow triggers

**Week 3:**
7. [ ] Performance benchmark
8. [ ] Entity Analytics coordination (@entity-team)

---

## Open Questions

1. [ ] Attachments V2 timeline from @christineweng? (Needed by week 2)
2. [ ] Workflow triggers readiness from @janmonschke? (Needed by week 5)
3. [ ] Maintainers Framework supports 12-step sequential pattern? (Confirm with Entity Analytics)
4. [ ] Alerting V2 timeline? (Monitor weekly, impacts long-term architecture)

---

## Links

- **Related Issues:** [#12345](link), [#12346](link)
- **Competitor Demos:** [Splunk video](link), [CrowdStrike docs](link)
- **Slack Threads:** [#kibana-cases discussion](link)
```

**Report output location:**
```
docs/
  discovery/
    <feature>_discovery_report.md
    <feature>_competitive_analysis.md
    <feature>_risk_analysis.md
```

**Actions after report:**
1. Post discovery report to GitHub issue
2. Share in relevant Slack channels
3. Send coordination messages to identified teams
4. Wait for responses on blockers (if any)
5. Proceed to Phase 1 (Spike Planning)

---

### Phase 1: Spike Planning & Scope Definition (10 min)

**Goal:** Define MVP scope based on discovery findings.

#### Questions to Answer:

**1. What is the spike trying to validate?**
- Technical feasibility? ("Can we integrate EPSS API?")
- User experience? ("Is this UI flow intuitive?")
- Performance? ("Can we process 10K alerts/sec?")
- Architecture approach? ("Should we use streaming vs batch?")

**2. What's the success criteria?**
- Demo-able end-to-end flow
- Performance meets threshold (e.g., < 5s response time)
- Stakeholder feedback is positive
- Technical approach is validated

**3. What's in scope vs out of scope?**

**In scope (MVP for validation):**
- Core happy path (1 user flow)
- Minimal viable UI (functional, not polished)
- Basic error handling (not comprehensive)
- Local testing (not full CI coverage)

**Out of scope (save for production implementation):**
- Edge cases and error paths
- Internationalization (i18n)
- Full RBAC coverage
- Performance optimization beyond validation
- Production monitoring/alerting

**4. Time box:**
- Target: 2-5 days max for spike
- If taking longer → split scope or escalate to full feature

**5. Adjust scope based on discovery findings:**
- If high-risk blockers found → reduce scope to avoid blocked areas
- If competitive analysis revealed complexity → adjust expectations
- If overlap detected → coordinate scope to avoid duplication

---

### Phase 2: Feature Flag Setup (10 min) 🚀

**Goal:** Make spike safe to merge behind a feature flag.

#### Step 2.1: Create Feature Branch

```bash
git checkout -b spike/<feature-name>
```

#### Step 2.2: Add Feature Flag

**For Kibana Advanced Settings:**

```typescript
// x-pack/plugins/<your-plugin>/common/ui_settings.ts
export const FEATURE_FLAG_KEY = '<plugin>:<feature>_enabled';

export const uiSettings = {
  [FEATURE_FLAG_KEY]: {
    name: i18n.translate('<plugin>.featureFlag.<feature>.name', {
      defaultMessage: '<Feature Name> (Experimental)',
    }),
    value: false, // Disabled by default
    description: i18n.translate('<plugin>.featureFlag.<feature>.description', {
      defaultMessage:
        'Enable experimental <feature> functionality. ' +
        'This is a spike/proof-of-concept and may be removed or changed in future releases.',
    }),
    category: ['<plugin>'],
    schema: schema.boolean(),
    requiresPageReload: true,
  },
};
```

**Register in plugin setup:**

```typescript
// x-pack/plugins/<your-plugin>/server/plugin.ts
export class Plugin implements IPlugin {
  setup(core: CoreSetup) {
    core.uiSettings.register(uiSettings);
  }
}
```

#### Step 2.3: Use Flag in Code

```typescript
// Check flag before enabling feature
const isFeatureEnabled = await uiSettings.get<boolean>(FEATURE_FLAG_KEY);

if (!isFeatureEnabled) {
  return; // Feature disabled, skip
}
```

**Why feature flags?**
- Safe to merge incomplete work
- Easy to demo (toggle on)
- Easy to disable if issues found
- Shows production-thinking (not throwaway code)

---

### Phase 3: E2E Implementation (2-4 days) 💻

**Goal:** Implement full stack (backend → processing → UI) for core happy path.

**NOTE:** This phase is fully autonomous. I will:
- Implement all layers (Backend, Processing, UI)
- Handle all setup (no asking user to run servers)
- Generate sample data if needed
- Auto-start Kibana for testing

#### Architecture Layers (Work Bottom-Up):

**Layer 1: Backend API**
- Define REST endpoint (`/api/<plugin>/<feature>`)
- Implement request/response schema (Zod/io-ts)
- Add route handler with core logic
- Add basic error handling (400, 404, 500)

**Example:**
```typescript
// x-pack/plugins/<plugin>/server/routes/<feature>.ts
router.versioned
  .post({
    path: '/api/<plugin>/<feature>',
    access: 'internal',
    security: {
      authz: {
        requiredPrivileges: ['<plugin>', 'read'],
      },
    },
  })
  .addVersion(
    {
      version: '1',
      validate: {
        request: {
          body: schema.object({
            // Request schema
          }),
        },
      },
    },
    async (context, request, response) => {
      try {
        const result = await processFeature(request.body);
        return response.ok({ body: result });
      } catch (err) {
        return response.customError({
          statusCode: 500,
          body: { message: err.message },
        });
      }
    }
  );
```

---

**Layer 2: Processing Logic**
- Implement core algorithm/business logic
- Add data transformations
- Integrate with external APIs (if needed)
- Add logging for debugging

**Example:**
```typescript
// x-pack/plugins/<plugin>/server/lib/<feature>_processor.ts
export async function processFeature(input: FeatureInput): Promise<FeatureOutput> {
  // 1. Validate input
  if (!input.id) {
    throw new Error('Missing required field: id');
  }

  // 2. Fetch data
  const data = await fetchExternalData(input.id);

  // 3. Transform
  const processed = transformData(data);

  // 4. Store result (if needed)
  await storeResult(processed);

  return processed;
}
```

---

**Layer 3: UI Components**
- Create React component for feature
- Add to plugin navigation (if needed)
- Implement data fetching via API
- Add loading/error states
- Use EUI components for consistency

**Example:**
```typescript
// x-pack/plugins/<plugin>/public/components/<feature>/<feature>_page.tsx
import React, { useEffect, useState } from 'react';
import { EuiPage, EuiPageBody, EuiLoadingSpinner, EuiCallOut } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export const FeaturePage = () => {
  const { http } = useKibana().services;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await http.post('/api/<plugin>/<feature>', {
          body: JSON.stringify({ /* params */ }),
        });
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [http]);

  if (loading) return <EuiLoadingSpinner size="xl" />;
  if (error) return <EuiCallOut title="Error" color="danger">{error}</EuiCallOut>;

  return (
    <EuiPage>
      <EuiPageBody>
        {/* Feature UI */}
      </EuiPageBody>
    </EuiPage>
  );
};
```

---

#### Step 3.4: Autonomous Environment Setup

**I will handle all setup automatically:**

```bash
# 1. Bootstrap if needed
if [ ! -d "node_modules" ]; then
  yarn kbn bootstrap
fi

# 2. Start Elasticsearch in background (if not running)
if ! curl -s http://localhost:9200 > /dev/null; then
  yarn es snapshot --license trial &
  sleep 30  # Wait for ES to start
fi

# 3. Start Kibana in background with feature flag enabled
KIBANA_FEATURE_FLAGS='<plugin>:<feature>_enabled:true' yarn start &
KIBANA_PID=$!
sleep 60  # Wait for Kibana to start

# 4. Generate sample data (if feature needs it)
node scripts/generate_sample_data.js --feature <feature>

# 5. Verify setup
curl -s http://localhost:5601/api/status | jq '.status.overall.level'
```

**No user intervention required** - I handle all environment setup.

---

### Phase 4: Testing (1 day) ✅

**Goal:** Comprehensive test coverage (unit, integration, E2E).

#### Test Layers:

**1. Unit Tests (Processing Logic)**
```typescript
// x-pack/plugins/<plugin>/server/lib/<feature>_processor.test.ts
describe('processFeature', () => {
  it('should transform input correctly', () => {
    const input = { id: '123' };
    const result = processFeature(input);
    expect(result).toMatchObject({ /* expected */ });
  });

  it('should throw on invalid input', () => {
    expect(() => processFeature({})).toThrow('Missing required field');
  });
});
```

**2. Integration Tests (API Routes)**
```typescript
// x-pack/plugins/<plugin>/server/routes/<feature>.test.ts
describe('POST /api/<plugin>/<feature>', () => {
  it('should return 200 with valid input', async () => {
    const response = await supertest(httpService)
      .post('/api/<plugin>/<feature>')
      .send({ id: '123' })
      .expect(200);

    expect(response.body).toMatchObject({ /* expected */ });
  });

  it('should return 400 with invalid input', async () => {
    await supertest(httpService)
      .post('/api/<plugin>/<feature>')
      .send({})
      .expect(400);
  });
});
```

**3. Scout E2E Tests (UI Flow)**
```typescript
// x-pack/plugins/<plugin>/test/scout_ui/<feature>.spec.ts
import { test, expect } from '@kbn/scout';

test.describe('<Feature> spike', () => {
  test.beforeAll(async ({ uiSettings }) => {
    // Enable feature flag
    await uiSettings.set('<plugin>:<feature>_enabled', true);
  });

  test('should display feature page', async ({ page, pageObjects }) => {
    await pageObjects.navigation.goto<Feature>();
    await expect(page.getByTestId('<feature>-page')).toBeVisible();
  });

  test('should process data successfully', async ({ page }) => {
    await page.getByTestId('<feature>-submit').click();
    await expect(page.getByTestId('<feature>-result')).toBeVisible();
  });
});
```

**I will run all tests automatically:**

```bash
# Unit tests
yarn test:jest x-pack/plugins/<plugin>/server/**/*.test.ts

# Integration tests
yarn test:jest_integration x-pack/plugins/<plugin>/server/**/*.test.ts

# Scout E2E tests
node scripts/scout run-tests --arch stateful \
  --config x-pack/plugins/<plugin>/test/scout_ui/scout.config.ts
```

---

### Phase 5: Comprehensive QA & Bug Discovery (2-3 hours) 🔍

**Goal:** Systematically test all scenarios with E2E tests AND manual UI testing to catch bugs before demo.

**Philosophy:** Spikes deserve the same QA rigor as production code. Bugs found in demos damage credibility.

---

#### Step 5.1: E2E Test Coverage for All Scenarios (1-1.5 hours)

**Rule:** Every user-facing scenario must have a Scout E2E test.

**Scenario mapping:**

| User Scenario | Scout E2E Test | Priority |
|---------------|----------------|----------|
| Feature flag disabled → feature hidden | `<feature>_feature_flag_disabled.spec.ts` | MUST |
| Feature flag enabled → feature visible | `<feature>_feature_flag_enabled.spec.ts` | MUST |
| Happy path: valid input → success | `<feature>_happy_path.spec.ts` | MUST |
| Invalid input → error message shown | `<feature>_validation_errors.spec.ts` | MUST |
| Network error → retry or error UI | `<feature>_network_errors.spec.ts` | SHOULD |
| Loading state → spinner shown | `<feature>_loading_states.spec.ts` | SHOULD |
| Empty state → placeholder UI | `<feature>_empty_state.spec.ts` | SHOULD |

**I will generate comprehensive E2E test suite automatically** (see original skill for full example)

---

#### Step 5.2: Automated UI Testing (30 min)

**I will handle automated UI testing:**

```bash
# 1. Start Playwright in headless mode
npx playwright test --config test/scout_ui/scout.config.ts

# 2. Capture screenshots during test run
npx playwright test --screenshot=on --video=on

# 3. Generate test report
npx playwright show-report
```

**No manual UI testing required** - automated tests cover all scenarios.

---

#### Step 5.3: Bug Fixing Iteration (30 min - 2 hours)

**Priority:** Fix critical bugs before demo, defer minor bugs to "What's Next"

**Fix workflow:**
1. **Categorize bugs** by severity (Critical, Major, Minor)
2. **Fix critical bugs** (blocks demo)
3. **Fix major bugs** (poor UX)
4. **Defer minor bugs** (document in "What's Next")

**After fixes:**
- Re-run E2E tests: `node scripts/scout run-tests ...`
- Update bug tracking doc
- Capture new screenshots if UI changed

---

### Phase 6: Demo Scripts & Manual Validation (30 min) 📝

**Goal:** Generate step-by-step demo scripts and manual validation workflows.

**NOTE:** This is fully autonomous - I generate all scripts and workflows.

---

#### Step 6.1: Demo Script Generation

**I will generate demo script:**

```markdown
# <Feature> Spike - Demo Script

**Duration:** 5-10 minutes
**Audience:** Stakeholders, product managers, engineers
**Prerequisites:** Kibana running with feature flag enabled

---

## Setup (before demo)

**Automated setup script:**

```bash
#!/bin/bash
# demo_setup.sh - Run this before the demo

# 1. Ensure Kibana is running
if ! curl -s http://localhost:5601/api/status > /dev/null; then
  echo "Starting Kibana..."
  KIBANA_FEATURE_FLAGS='<plugin>:<feature>_enabled:true' yarn start &
  sleep 60
fi

# 2. Enable feature flag via API
curl -X POST http://localhost:5601/api/kibana/settings/<plugin>:<feature>_enabled \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: true' \
  -d '{"value": true}'

# 3. Load sample data
node scripts/generate_sample_data.js --feature <feature> --count 100

# 4. Open browser to feature page
open "http://localhost:5601/app/<plugin>/<feature>"

echo "✅ Demo setup complete! Ready to present."
```

---

## Demo Flow

### Act 1: Problem Statement (1 min)

**Script:**
> "Today we're demoing <feature>, which solves [problem statement].
> Currently, users have to [manual process]. This spike demonstrates
> how we can automate this with [approach]."

**Visual:** Show slide/diagram of current vs. proposed flow

---

### Act 2: Feature Flag Toggle (30 sec)

**Script:**
> "This is behind a feature flag, so it's safe to merge. Let me show you
> how to enable it."

**Actions:**
1. Navigate to: Stack Management → Advanced Settings
2. Search for: `<plugin>:<feature>_enabled`
3. Toggle to: `true`
4. Click: Save

**Expected:** Feature appears in navigation

**Screenshot:** [feature_flag_enabled.png]

---

### Act 3: Core Happy Path (3 min)

**Script:**
> "Let's walk through the core workflow. First, I'll [step 1]..."

**Actions:**
1. Navigate to: `<Feature>` page
2. Fill form:
   - Field 1: `Test Input`
   - Field 2: `12345`
3. Click: Submit
4. Wait for result (2-3 seconds)
5. Verify result displayed

**Expected:**
- Loading spinner appears
- Result displays: `<expected-result>`
- Success toast: "Feature processed successfully"

**Screenshot:** [happy_path_result.png]

---

### Act 4: Error Handling (1 min)

**Script:**
> "Now let me show you how errors are handled..."

**Actions:**
1. Clear form
2. Leave required field empty
3. Click: Submit

**Expected:**
- Validation error: "Field is required"
- Form stays filled (except invalid field)
- Retry is possible

**Screenshot:** [validation_error.png]

---

### Act 5: Performance (1 min)

**Script:**
> "Performance is important. Let me show you how fast this is..."

**Actions:**
1. Submit 10 requests rapidly (use demo_load_test.sh script)
2. Show performance metrics:
   - Average response time: < 2s
   - P99 response time: < 5s
   - No errors or timeouts

**Screenshot:** [performance_metrics.png]

---

### Act 6: What's Next (2 min)

**Script:**
> "This is a spike, so it's not production-ready. Here's what we'd need
> for production..."

**Visual:** Show slide with production readiness checklist:
- [ ] Full error handling (validation, network, edge cases)
- [ ] RBAC for all roles
- [ ] i18n for all UI strings
- [ ] Performance optimization
- [ ] Comprehensive test coverage
- [ ] Monitoring/alerting
- [ ] Security review

**Script:**
> "Estimated effort: 2-3 weeks for production implementation. Questions?"

---

## Demo Recovery (If Something Goes Wrong)

### Issue: Feature not visible after enabling flag
**Fix:**
```bash
# Hard refresh Kibana
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

### Issue: API returns 500 error
**Fix:**
```bash
# Check Kibana logs
tail -f logs/kibana.log | grep ERROR

# Restart Kibana if needed
pkill -f kibana
yarn start
```

### Issue: Sample data not loaded
**Fix:**
```bash
# Re-run sample data script
node scripts/generate_sample_data.js --feature <feature> --count 100 --force
```

---

## Post-Demo Cleanup

```bash
#!/bin/bash
# demo_cleanup.sh - Run this after the demo

# 1. Disable feature flag
curl -X POST http://localhost:5601/api/kibana/settings/<plugin>:<feature>_enabled \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: true' \
  -d '{"value": false}'

# 2. Delete sample data
node scripts/delete_sample_data.js --feature <feature>

echo "✅ Demo cleanup complete!"
```

---

## Demo Tips

- **Practice first:** Run through demo 2-3 times before presenting
- **Have backup:** Keep screenshots handy in case live demo fails
- **Time management:** Set 5-min timer, skip optional parts if running long
- **Engage audience:** Ask questions, pause for feedback
- **Handle questions:** "Great question, let me add that to the What's Next list"
```

**Demo script location:**
```
docs/
  demo/
    <feature>_demo_script.md
    <feature>_demo_setup.sh
    <feature>_demo_cleanup.sh
    <feature>_demo_load_test.sh
```

---

#### Step 6.2: Manual Validation Workflow Generation

**I will generate step-by-step manual validation workflow:**

```markdown
# <Feature> Spike - Manual Validation Workflow

**Purpose:** Step-by-step instructions for manually validating the spike works correctly.

**Audience:** QA engineers, developers, stakeholders

**Duration:** 15-20 minutes

---

## Prerequisites

- [ ] Kibana running locally
- [ ] Feature flag enabled (`<plugin>:<feature>_enabled = true`)
- [ ] Sample data loaded

**Automated setup:**

```bash
./docs/demo/<feature>_demo_setup.sh
```

---

## Validation Steps

### Step 1: Feature Flag Controls Visibility

**Goal:** Verify feature flag properly enables/disables feature

**Actions:**

1. Navigate to: Stack Management → Advanced Settings
2. Search for: `<plugin>:<feature>_enabled`
3. Verify current value: `true`
4. Navigate to: `<Plugin>` app
5. Verify: Feature appears in navigation
6. Navigate to: Advanced Settings
7. Set: `<plugin>:<feature>_enabled = false`
8. Save
9. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
10. Navigate to: `<Plugin>` app
11. Verify: Feature does NOT appear in navigation

**Expected:** Feature visibility follows flag state

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 2: Happy Path - Valid Input Produces Result

**Goal:** Verify core functionality works end-to-end

**Actions:**

1. Enable feature flag (if disabled)
2. Navigate to: `<Feature>` page
3. Fill form:
   - Field 1: `Test Input`
   - Field 2: `12345`
4. Click: Submit
5. Observe: Loading spinner appears
6. Wait: 2-5 seconds
7. Verify: Result displayed with value `<expected>`
8. Verify: Success toast appears

**Expected:**
- Loading state shown
- Result displays correct value
- Success feedback provided

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 3: Validation Errors - Empty Required Field

**Goal:** Verify validation errors work correctly

**Actions:**

1. Navigate to: `<Feature>` page
2. Leave Field 1 empty
3. Fill Field 2: `12345`
4. Click: Submit
5. Verify: Error message "Field 1 is required"
6. Verify: Form stays filled (Field 2 value preserved)
7. Verify: Submit button remains enabled
8. Fill Field 1: `Test`
9. Click: Submit
10. Verify: Success (no error)

**Expected:**
- Clear error message
- Form state preserved
- Retry is possible

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 4: Validation Errors - Invalid Format

**Goal:** Verify format validation works

**Actions:**

1. Navigate to: `<Feature>` page
2. Fill Field 1: `Test`
3. Fill Field 2: `invalid` (expects number)
4. Click: Submit
5. Verify: Error message "Field 2 must be a number"
6. Fix Field 2: `12345`
7. Click: Submit
8. Verify: Success

**Expected:**
- Specific format error message
- Correction possible

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 5: Network Error Handling

**Goal:** Verify graceful handling of network failures

**Actions:**

1. Open browser DevTools: Network tab
2. Enable: Offline mode
3. Navigate to: `<Feature>` page
4. Fill form with valid data
5. Click: Submit
6. Verify: Error message "Network error occurred"
7. Verify: Retry button appears
8. Disable: Offline mode
9. Click: Retry
10. Verify: Success

**Expected:**
- Clear error message for network failure
- Retry mechanism provided
- Recovery after network restored

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 6: Loading State

**Goal:** Verify loading indicator works

**Actions:**

1. Open browser DevTools: Network tab
2. Enable: Slow 3G throttling
3. Navigate to: `<Feature>` page
4. Fill form with valid data
5. Click: Submit
6. Immediately verify: Loading spinner visible
7. Verify: Submit button disabled during loading
8. Wait for response
9. Verify: Loading spinner disappears
10. Verify: Result displayed

**Expected:**
- Loading feedback shown
- Button disabled during API call
- No duplicate requests

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 7: Empty State

**Goal:** Verify empty state placeholder

**Actions:**

1. Navigate to: `<Feature>` page (fresh load)
2. Verify: Empty state placeholder visible
3. Verify: Message "No data available" (or similar)
4. Submit valid data
5. Verify: Empty state disappears
6. Verify: Result displayed

**Expected:**
- Clear empty state UI
- Placeholder disappears after data loads

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 8: Multiple Submissions

**Goal:** Verify feature handles repeated use

**Actions:**

1. Navigate to: `<Feature>` page
2. Submit request 1: Input A
3. Verify: Result A displayed
4. Submit request 2: Input B
5. Verify: Result B displayed (replaces A)
6. Submit request 3: Input C
7. Verify: Result C displayed (replaces B)

**Expected:**
- Each submission produces correct result
- No stale data from previous submissions
- No memory leaks (check DevTools Memory tab)

**Status:** ✅ Pass / ❌ Fail

**Notes:** _____________________________

---

### Step 9: Browser Compatibility (Optional but Recommended)

**Goal:** Verify feature works across browsers

**Test in each browser:**

- [ ] Chrome (primary)
- [ ] Firefox
- [ ] Safari
- [ ] Edge

**Actions per browser:**

1. Open browser
2. Navigate to Kibana: http://localhost:5601
3. Enable feature flag
4. Run Step 2 (Happy Path)
5. Verify: Works correctly

**Expected:** Feature works consistently across browsers

**Status:** ✅ Pass / ❌ Fail

**Browser-specific issues:** _____________________________

---

### Step 10: Console Clean (No Errors)

**Goal:** Verify no JavaScript errors

**Actions:**

1. Open browser DevTools: Console tab
2. Clear console
3. Navigate to: `<Feature>` page
4. Perform happy path flow
5. Review console
6. Verify: No errors (red messages)
7. Verify: No warnings (yellow messages)

**Expected:**
- Zero console errors
- Zero React warnings
- Zero unhandled promise rejections

**Status:** ✅ Pass / ❌ Fail

**Errors found:** _____________________________

---

## Validation Summary

**Total steps:** 10
**Passed:** ____ / 10
**Failed:** ____ / 10
**Blocked:** ____ / 10

**Critical issues found:**
1. _____________________________
2. _____________________________

**Minor issues found:**
1. _____________________________
2. _____________________________

**Overall assessment:**
- ✅ **PASS:** Spike is demo-ready (0 critical issues)
- ⚠️ **CONDITIONAL PASS:** Spike is demo-ready with caveats (1-2 minor issues)
- ❌ **FAIL:** Spike is NOT demo-ready (critical issues exist)

**Recommended action:**
- _____________________________ (e.g., "Fix BUG-001 before demo", "Proceed to Phase 7")

---

## Cleanup

After validation, run cleanup:

```bash
./docs/demo/<feature>_demo_cleanup.sh
```
```

**Manual validation workflow location:**
```
docs/
  validation/
    <feature>_manual_validation_workflow.md
```

---

### Phase 7: Documentation (1 hour) 📄

**Goal:** Technical writeup that explains the spike and sets up follow-on work.

#### Document Structure:

Create `docs/<feature>_spike.md`:

```markdown
# <Feature Name> Spike

**Author:** [Your Name]
**Date:** [YYYY-MM-DD]
**Status:** Spike/PoC (Experimental)

---

## Overview

[2-3 sentences: What problem does this solve? What does it demonstrate?]

---

## Discovery Findings

### Competitive Analysis Summary

**Key insights from competitors:**
- **Splunk:** [What they do well that we adopted]
- **CrowdStrike:** [Pattern we learned from]
- **Differentiation:** [How our approach is unique]

**Full analysis:** See [competitive_analysis.md](discovery/<feature>_competitive_analysis.md)

---

### Overlap & Coordination

**Overlapping work detected:**
- [Issue #12345] - 80% overlap, coordinated with @user
- [PR #12346] - 20% overlap, reused patterns

**Teams coordinated:**
- Cases team (@christineweng) - Attachments V2 timeline
- ResponseOps (@janmonschke) - Workflow triggers

---

### Risks & Mitigations

**High risks:**
1. Attachments V2 timing → Mitigation: Built with V1, migration plan ready
2. [Risk 2] → Mitigation: [...]

**Full risk analysis:** See [risk_analysis.md](discovery/<feature>_risk_analysis.md)

---

## Architecture

### Components

**Backend:**
- API endpoint: `POST /api/<plugin>/<feature>`
- Processing: `<feature>_processor.ts`
- External integrations: [list]

**Frontend:**
- Page: `<feature>_page.tsx`
- Components: [list]

### Data Flow

```
User Input → API Call → Processing Logic → External API (if any) → Transform → UI Display
```

---

## Implementation Details

### Key Decisions

1. **[Decision 1]:** [Why this approach vs alternatives]
2. **[Decision 2]:** [Trade-offs considered]

### Feature Flag

- **Key:** `<plugin>:<feature>_enabled`
- **Default:** `false` (disabled)
- **Location:** Advanced Settings → <Plugin>

---

## Demo

### Demo Script

**Automated demo:** See [demo_script.md](demo/<feature>_demo_script.md)

**Setup:**
```bash
./docs/demo/<feature>_demo_setup.sh
```

**Run demo:** Follow [demo_script.md](demo/<feature>_demo_script.md)

### Screenshots

![Feature flag enabled](screenshots/<feature>_01_feature_flag_enabled.png)
![Page loaded](screenshots/<feature>_02_page_loaded.png)
![Result displayed](screenshots/<feature>_03_result_displayed.png)

---

## Validation

### Automated Tests

- ✅ Unit tests: `<feature>_processor.test.ts`
- ✅ Integration tests: `<feature>.test.ts`
- ✅ Scout E2E tests: `<feature>.spec.ts`

**Test coverage:** 85% (lines), 90% (branches)

### Manual Validation

**Manual validation workflow:** See [manual_validation_workflow.md](validation/<feature>_manual_validation_workflow.md)

**Validation status:** ✅ Passed (10/10 steps)

---

## What's Next

### Production Readiness (Out of Scope for Spike)

**Must-haves for production:**
- [ ] Full error handling (validation, network, edge cases)
- [ ] RBAC: Privilege checks for all roles (viewer, editor, admin)
- [ ] Internationalization (i18n) for all UI strings
- [ ] Performance optimization (caching, lazy loading)
- [ ] Comprehensive test coverage (edge cases, error paths)
- [ ] Monitoring/alerting (APM, logs, metrics)
- [ ] Documentation (user guide, API reference)
- [ ] Security review (input validation, XSS, CSRF)

**Nice-to-haves:**
- [ ] Advanced filtering/sorting in UI
- [ ] Export functionality (CSV, JSON)
- [ ] Bulk operations
- [ ] Keyboard shortcuts

### Migration Plans (If Fallbacks Were Used)

**If built with Attachments V1 (fallback):**
- **Migration effort:** ~2-3 days
- **Migration plan:** Re-register via `registerUnified()`, change payload shape, add dual-read logic
- **Migration trigger:** When Attachments V2 #256133 is merged

**If built with custom hook (fallback):**
- **Migration effort:** ~3-5 days
- **Migration plan:** Remove hook, register workflow trigger handler, test configs
- **Migration trigger:** When Workflow Triggers #257284 is merged

### Follow-On Work

**Phase 2 (Production Implementation):** [2-3 weeks]
- Implement all "must-haves" above
- Security review and performance optimization
- Full RBAC coverage and i18n

**Phase 3 (Enhancements):** [1-2 weeks]
- Advanced features from "nice-to-haves"
- User feedback integration

---

## Links

- **Discovery Report:** [discovery_report.md](discovery/<feature>_discovery_report.md)
- **Demo Script:** [demo_script.md](demo/<feature>_demo_script.md)
- **Validation Workflow:** [manual_validation_workflow.md](validation/<feature>_manual_validation_workflow.md)
- **PR:** [#12345](link)
- **Related Issues:** [#12346](link), [#12347](link)
- **Slack Threads:** [#kibana-cases discussion](link)
```

---

### Phase 8: PR Creation & Review (30 min) 🚀

**Goal:** Create well-structured PR ready for review.

#### PR Template:

```markdown
## Summary

Spike/PoC for <feature> to validate [technical approach / user experience / feasibility].

**Feature flag:** `<plugin>:<feature>_enabled` (disabled by default)

**Discovery completed:** Competitive analysis, overlap detection, risk assessment (see [discovery report](docs/discovery/<feature>_discovery_report.md))

---

## Discovery Findings

### Competitive Analysis
- **Splunk:** [Key insight adopted]
- **CrowdStrike:** [Pattern learned]
- **Differentiation:** [How we're unique]

**Full analysis:** [competitive_analysis.md](docs/discovery/<feature>_competitive_analysis.md)

### Overlap & Coordination
- [Issue #12345] - 80% overlap, coordinated with @user
- [PR #12346] - 20% overlap, reused patterns

### Risks & Blockers
- 🔴 **High Risk:** Attachments V2 timing → Built with V1 fallback, migration plan ready
- 🟡 **Medium Risk:** Workflow triggers → Custom hook used, will migrate when #257284 lands

**Full risk analysis:** [risk_analysis.md](docs/discovery/<feature>_risk_analysis.md)

---

## Implementation

### Backend
- API endpoint: `POST /api/<plugin>/<feature>`
- Processing logic in `<feature>_processor.ts`
- [External integrations]

### Frontend
- Page component: `<feature>_page.tsx`
- Navigation: [where accessible]

### Tests
- ✅ Unit tests (processing logic) - 85% coverage
- ✅ Integration tests (API routes) - 90% coverage
- ✅ Scout E2E tests (UI flow) - 7 scenarios covered

---

## Demo & Validation

### Demo Resources
- **Demo script:** [demo_script.md](docs/demo/<feature>_demo_script.md)
- **Setup script:** `./docs/demo/<feature>_demo_setup.sh`
- **Cleanup script:** `./docs/demo/<feature>_demo_cleanup.sh`

### Manual Validation
- **Validation workflow:** [manual_validation_workflow.md](docs/validation/<feature>_manual_validation_workflow.md)
- **Status:** ✅ Passed (10/10 steps)

---

## Screenshots

![Feature flag enabled](docs/screenshots/<feature>_01_feature_flag_enabled.png)
![Happy path demo](docs/screenshots/<feature>_02_happy_path.png)
![Error handling](docs/screenshots/<feature>_03_error_handling.png)

---

## What's Next

### Production Readiness (Out of Scope)
- Full error handling, RBAC, i18n
- Performance optimization, monitoring
- Security review

**Estimated effort:** 2-3 weeks for production implementation

### Migration Plans (If Fallbacks Used)
- **Attachments V1 → V2:** ~2-3 days (when #256133 merges)
- **Custom hook → Workflow triggers:** ~3-5 days (when #257284 merges)

**Full production plan:** [spike.md](docs/<feature>_spike.md)

---

## Checklist

- [x] Discovery completed (competitive analysis, overlap detection, risk assessment)
- [x] Feature flag added
- [x] E2E implementation (backend → UI)
- [x] Tests added (unit, integration, Scout E2E)
- [x] Demo script and validation workflow generated
- [x] Documentation written (spike.md, discovery report, demo script, validation workflow)
- [x] Screenshots captured
- [x] Manual validation passed (10/10 steps)
- [x] Cross-team coordination completed (Cases, ResponseOps notified)

---

🔬 **This is a spike/PoC.** It demonstrates feasibility but is not production-ready. See [spike.md](docs/<feature>_spike.md) for production roadmap.

🔗 **Discovery artifacts:** All discovery, demo, and validation docs are in `/docs/` directory.
```

---

## Success Criteria

**A spike is complete when:**
1. ✅ **Discovery done:** Competitive analysis, overlap detection, risk assessment complete
2. ✅ **Demo-able:** End-to-end flow works with automated demo script
3. ✅ **Feature-flagged:** Safe to merge (disabled by default)
4. ✅ **Tested:** Unit, integration, Scout E2E tests pass + manual validation passed
5. ✅ **Fully autonomous:** All setup automated (no user intervention needed)
6. ✅ **Documented:** Spike doc + discovery report + demo script + validation workflow
7. ✅ **Validated:** Manual validation workflow passed (10/10 steps)
8. ✅ **PR created:** Merged to main (or ready to merge)
9. ✅ **Coordinated:** Relevant teams notified, blockers documented

---

## Integration with Other Skills

- **scout-ui-testing** - Use for E2E test creation
- **kibana-api** - Use for API integration
- **systematic-debugging** - Use if bugs found during validation

---

## Autonomous Operation Philosophy

**This skill operates fully autonomously:**

1. **No manual setup required:**
   - I start/stop Elasticsearch and Kibana automatically
   - I generate sample data automatically
   - I run all tests automatically
   - I capture screenshots automatically

2. **No user questions about setup:**
   - I never ask "Can you run this command?"
   - I never ask "Can you load this data?"
   - I handle all environment setup silently

3. **I generate all artifacts:**
   - Demo scripts (setup, run, cleanup)
   - Manual validation workflows (step-by-step)
   - Sample data generators
   - Load test scripts

4. **User only answers functionality questions:**
   - "What should the feature do?"
   - "What's the expected behavior?"
   - "Should we support X or Y?"

**Everything else is my responsibility.**

---

## State Recognition & Gap Filling

**When continuing existing spike:**

1. **Detect state** (Step 0.1) - Assess what exists
2. **Identify gaps** - Compare against success criteria
3. **Prioritize gaps** - Critical → Important → Nice-to-have
4. **Fill gaps autonomously** - Implement missing pieces
5. **Validate** - Run tests and validation workflow
6. **Document** - Update docs with filled gaps

**Example:**
```
Detected state:
✅ Backend API (complete)
⚠️  UI components (partial - missing error handling)
❌ Feature flag (missing)
❌ Tests (missing)
❌ Demo script (missing)

Gaps to fill:
1. Add feature flag (10 min)
2. Complete UI error handling (1 hour)
3. Add comprehensive tests (2 hours)
4. Generate demo script and validation workflow (30 min)
5. Document all work (1 hour)

Total effort: ~5 hours to complete spike
```

---

## Example: Alert Investigation Pipeline Spike

**Scenario:** "Build a spike for automated alert-to-investigation pipeline in Security Solution"

**Execution:**

### Phase 0: Discovery (45 min)
1. **Competitive analysis:**
   - Splunk: Enterprise Security Correlation Search
   - CrowdStrike: Falcon X Threat Intelligence
   - Sentinel: Fusion ML-based incident correlation

2. **Overlap detection:**
   - Found: [security-team#16179] Entity Extraction (80% overlap)
   - Action: Coordinated with @security-team, split scope

3. **Blockers identified:**
   - 🔴 Cases Attachments V2 not merged
   - 🟡 Workflow triggers not stable
   - Fallback plan: V1 API + custom hooks

4. **Risk analysis:**
   - High: Attachments V2 timing → Mitigation ready
   - Medium: Performance at scale → Early benchmark planned

5. **Coordination:**
   - Cases team (@christineweng) contacted
   - ResponseOps (@janmonschke) sync scheduled

6. **Report generated:** [alert_investigation_pipeline_discovery_report.md]

### Phase 1-8: Implementation (3.5 days)
[Continue with standard phases...]

**Total time:** ~4 days (including discovery)
