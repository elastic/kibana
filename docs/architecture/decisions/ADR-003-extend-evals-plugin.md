# ADR-003: Extend Evals Plugin Instead of Creating New Plugin

**Status:** ✅ Accepted
**Date:** 2026-03-22
**Author:** Patryk Kopycinski
**Context:** AESOP PoC UI architecture

---

## Context

AESOP needs UI for:
- Viewing proposed skills
- Reviewing skill details with traces
- Approving/rejecting skills
- Monitoring exploration executions

Two architectural options:
- **Option A:** Create new `aesop` plugin from scratch
- **Option B:** Extend existing `evals` plugin with AESOP pages

---

## Decision

**Extend the evals plugin** with AESOP-specific pages and components.

---

## Rationale

### 1. Massive Code Reuse: ~48 Hours Saved

**Evals plugin (PR #254845) already provides:**

| Component | Reusable? | Saves |
|-----------|-----------|-------|
| **TraceWaterfall** | ✅ YES | ~12h (complex component) |
| **Eval runs list** | ⚠️ Pattern reuse | ~4h |
| **Dataset management** | ✅ YES (for eval datasets) | ~8h |
| **API integration hooks** | ✅ YES (`useEvalsApi`) | ~4h |
| **React Query setup** | ✅ YES | ~2h |
| **Kibana services context** | ✅ YES | ~2h |
| **Navigation boilerplate** | ✅ YES | ~4h |
| **Theme integration** | ✅ YES | ~2h |
| **i18n setup** | ✅ YES | ~2h |
| **Build configuration** | ✅ YES | ~8h |

**Total savings:** ~48 hours of UI development

**If we built new plugin:**
- Would duplicate ALL of the above
- Would need separate build config (jest, webpack, etc.)
- Would need separate plugin registration
- Would need to coordinate evals + aesop plugins (shared state?)

---

### 2. Natural Conceptual Fit

**Evals plugin purpose:** Run evaluations on AI features

**AESOP workflow:**
```
Explore → Propose Skills → VALIDATE (via evals!) → Deploy
                              ↑
                    Perfect fit for evals plugin
```

**AESOP IS an eval use case:**
- Proposes skills → Evaluates them → Iterates based on scores
- Uses same eval framework (@kbn/evals)
- Uses same trace infrastructure (O11y traces)
- Uses same UI patterns (list + detail + waterfall)

**Conceptual coherence:** "AESOP = Self-evaluating skill generator"

---

### 3. Shared Infrastructure Benefits

**Both evals + AESOP need:**
- Trace visualization (TraceWaterfall) ✅
- Eval execution (@kbn/evals) ✅
- Dataset management ✅
- Run history tracking ✅

**If separate plugins:**
- Duplicate TraceWaterfall? (maintenance nightmare)
- Two different trace UIs? (confusing UX)
- Coordinate eval execution? (complexity)

**By extending evals:**
- ✅ Single trace visualization system
- ✅ Consistent UX (users already know evals UI)
- ✅ Shared dataset infrastructure (eval datasets for validation)
- ✅ Unified eval execution (both use same @kbn/evals APIs)

---

### 4. User Experience Coherence

**User mental model:**

```
Evaluations App
├─ Manual Evals
│  ├─ Runs (I triggered these)
│  └─ Datasets (I created these)
│
└─ Autonomous Evals (AESOP)
   ├─ Proposed Skills (Agent generated these)
   ├─ Exploration History (Agent ran these)
   └─ [Uses same eval framework under the hood]
```

**Natural extension:** AESOP is "autonomous evals" vs "manual evals"

**Alternative (separate plugin):**
```
Evaluations App (manual only)
AESOP App (autonomous only)
```

**Problem:** Users need to context-switch, concepts fragment, shared infrastructure duplicates

---

### 5. Deployment & Maintenance

| Aspect | Separate Plugin | Extend Evals | Winner |
|--------|----------------|--------------|--------|
| **Plugin count** | +1 (aesop) | 0 (reuse evals) | Extend ✅ |
| **Build time** | +30s | +5s | Extend ✅ |
| **Bundle size** | +500KB | +50KB | Extend ✅ |
| **Maintenance burden** | 2 plugins | 1 plugin | Extend ✅ |
| **Dependency conflicts** | Higher risk | Lower risk | Extend ✅ |

---

## Implementation

### File Organization

```
x-pack/platform/plugins/shared/evals/
├── server/
│   ├── routes/
│   │   ├── runs.ts           # Existing evals routes
│   │   ├── datasets.ts       # Existing evals routes
│   │   └── aesop/            # ✅ AESOP routes (namespaced)
│   │       ├── run_exploration.ts
│   │       ├── list_proposed_skills.ts
│   │       └── ...
│   │
│   ├── lib/
│   │   └── aesop/            # ✅ AESOP business logic (namespaced)
│   │       ├── agents/
│   │       ├── workflows/
│   │       └── ...
│   │
│   └── workflows/
│       └── aesop/            # ✅ AESOP workflows (namespaced)
│
├── public/
│   ├── pages/
│   │   ├── runs_list/        # Existing evals pages
│   │   ├── datasets_list/    # Existing evals pages
│   │   └── aesop/            # ✅ AESOP pages (namespaced)
│   │       ├── proposed_skills_list.tsx
│   │       ├── exploration_dashboard.tsx
│   │       └── ...
│   │
│   └── components/
│       ├── trace_waterfall/  # ✅ SHARED (used by both evals + AESOP)
│       └── ...
```

**Key principle:** Namespace AESOP code clearly, but share infrastructure

---

### Navigation Structure

```
Stack Management → AI → Evaluations
├─ Runs (manual evals)
├─ Datasets (eval data)
└─ AESOP (autonomous evals)  ← Natural extension
   ├─ Proposed Skills
   └─ Exploration Dashboard
```

**Feels cohesive:** All "evaluation" concepts in one place

---

## Consequences

### Positive

- ✅ **48 hours development time saved**
- ✅ **Consistent UX** (users already familiar with evals patterns)
- ✅ **Shared infrastructure** (TraceWaterfall, @kbn/evals, datasets)
- ✅ **Smaller bundle size** (+50KB vs +500KB)
- ✅ **Easier maintenance** (1 plugin vs 2)
- ✅ **Faster build times** (+5s vs +30s)

### Negative

- ⚠️ **Evals plugin complexity increases** (more routes, more code)
- ⚠️ **Tight coupling** (AESOP depends on evals plugin infrastructure)
- ⚠️ **Namespace discipline required** (keep AESOP code clearly separated)

### Mitigations

**For complexity:**
- Clear namespacing (`/routes/aesop/`, `/lib/aesop/`, `/pages/aesop/`)
- Dedicated AESOP tab in UI (visual separation)
- Code owners: AESOP code can have different reviewers

**For coupling:**
- This is intentional (AESOP *should* use evals infrastructure)
- If evals plugin changes, AESOP adapts (acceptable dependency)
- Worst case: Can extract to separate plugin later (~2 days effort)

---

## Alternative Considered: Separate Plugin

**Why we rejected it:**

**Would need to build:**
- Custom trace visualization (~12h) - duplicates TraceWaterfall
- Custom eval execution (~8h) - duplicates @kbn/evals integration
- Custom dataset management (~8h) - duplicates evals datasets
- Custom React/theme setup (~4h) - duplicates boilerplate
- Separate plugin registration (~4h) - more deployment complexity

**Total wasted effort:** ~36 hours of duplication

**No benefits:** Can't think of a single advantage over extending evals

---

## Validation

**How will we know this was the right choice?**

**Metrics (Week 2):**
- [ ] AESOP + evals plugin bundle size <3MB (acceptable)
- [ ] Build time increase <10s (acceptable)
- [ ] Zero conflicts between evals + AESOP code (namespacing works)
- [ ] Users find AESOP in evals app naturally (UX intuitive)

**If any metric fails:** Revisit decision, consider extraction

**Expected:** All metrics pass, decision validated ✅

---

## Future Considerations

**If AESOP grows significantly (100+ files):**
- Consider: Extract to separate plugin
- Effort: ~2-3 days (move files, update imports, separate registration)
- Trade-off: Loses shared infrastructure benefits

**Threshold for extraction:** If AESOP code exceeds 50% of evals plugin codebase

**Current:** AESOP is ~30% of evals plugin (well below threshold)

---

## References

- Evals plugin PR: #254845
- TraceWaterfall component: `public/components/trace_waterfall/`
- Similar pattern: Security Solution extends itself (not separate plugins for each feature)

---

## Review & Update

**Next Review:** After 6 months production usage

**Update if:**
- AESOP grows to 50%+ of evals codebase
- Conflicts arise between evals + AESOP roadmaps
- Users confused by AESOP being in "Evaluations" app

**Expected:** Decision stands for foreseeable future ✅
