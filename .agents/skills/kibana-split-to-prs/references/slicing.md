# Slicing

North star is **time-to-merged**, not maximum PR count. Splitting costs stack overhead, splittability scaffolding, context-switching, GitHub mechanics.

## When not to split

**One PR when:** one [review question](review.md), one owner, low surprise; small scope (one team, few files, no SO/privilege/http-api risk); heavy splittability edits for little gain; time-sensitive work where stack delays first reviewable unit.

**Stack when:** separable CODEOWNERS teams; risk isolation (dark-ship, SO model version, privilege deprecation, HTTP+authz); mechanical noise would poison behavioral review; one file mixes mechanical + behavioral and extraction wins.

### Decision gate

1. Would one coherent PR stall review more than a stack stalls shipping the first slice?
2. Does each extra PR remove a **distinct review question** or just chop history?
3. Will splittability edits add more total review than they save?

If (2) and (3) favor splitting → stack. Else → **single PR**.

**Depth:** target ≤5 PRs; merge coherent slices or document why not.

**Stop splitting** when compile breaks without reasonable shims, hunks won't separate, or re-read tax exceeds benefit—propose shims (§splittability) before one big PR.

---

## Hotspots

Find in Phase 1 before boundaries.

| Signal | Action |
|--------|--------|
| Mechanical + behavioral in one file | Extract or dark-ship |
| Same file in 2+ PRs | Avoid—see cross-PR |
| Two review questions in one file | Extract or `const useNew = false` |
| Mixed team ownership | Split by file, or one PR + coupling note |
| God file | One-time extraction PR |

**Cross-PR default:** each file in at most one PR. Prefer extract, dedicated move/rename PR, or splittability edit.

**Acceptable** (Surprise audit + hunk map): flag/dark-ship sequence; poor prior factoring (`NEEDS DECISION`); generated + hand edit (`generated` tag).

```markdown
- `path/task_runner.ts` — PR2: wiring; PR3: `useNewRetry` branch (default false)
```

Anti-patterns (trojan mechanical, hidden defaults, stack-only readable, etc.): [review.md](review.md) §hidden-risk.

---

## Slice order

0. CODEOWNERS / team boundaries  
1. Module / dependency order (package API before consumer; shims if needed)  
2. Mechanical vs behavioral (not line-count driven)  
3. Unrelated concepts (feature/API/privilege, not directory)  
4. BBA + dark-ship: types → wire legacy → dark-ship new (`const useNew = false`) → flip → remove legacy  
5. Noise early: lockfile, generated mass updates, i18n JSON, Scout scaffold, bulk `kibana.jsonc`  
6. See [review.md](review.md) §hidden-risk for anti-patterns  

**Exception:** prettier/eslint from the behavioral edit in the same files stays in that PR.

**Titles:** one [review question](review.md)—not "Part 2" or file lists. Split if the title needs "and" for unrelated concerns.

### CODEOWNERS

1. [`.github/CODEOWNERS`](../../../.github/CODEOWNERS) · nested wins · `kibana.jsonc` `owner` · `node src/dev/stage_by_owner.ts`

Rules: one PR per team when separable; same team + related feature → one slice; no owner → `NEEDS DECISION`.

### Stack

`upstream/main` → PR1 → PR2 → … only. Build: types/shims/APIs first. Merge: foundations before behavioral flips.

### Mergeability

Flag per [AGENTS.md](../../../AGENTS.md): plugin `server/index.ts` lazy import; Saved Objects one model version per type per PR ([validate](../../../docs/extend/saved-objects/validate.md)); privilege deprecations ([skill](../../kibana-privilege-deprecation/SKILL.md)); tests with behavior.

---

## Splittability edits

Not pure git surgery—**edit code** when hunks, compile order, or review boundaries block a clean stack. Scaffolding for review only; design approved.

| Signal | Edit |
|--------|------|
| Consumer needs package exports | Temporary re-export/shim |
| Old + new impl in one file | BBA + dark-ship |
| Two questions in one file | Extract or `const useNew = false` |
| SO / privilege separate landing | Split schema from behavior |
| Mechanical + behavioral same hunk | Separate files or gated branches |
| PR N needs PR N+1 symbols | Stub, deprecated wrapper, `import type` |

**In scope:** dark-ship toggles, temp re-exports/no-ops, extracted files, lazy plugin entry, test doubles, hunk moves.  
**Out of scope:** unrelated fixes, permanent API you wouldn't ship as one PR, early behavior enablement.

**Workflow:** list in plan (per-PR under Mergeability + splittability); call out at Phase 4 gate; apply in Phase 5 before staging. Plan only → no code edits.

Record: `none` or edits **in this PR**; note PR # that removes scaffolding.
