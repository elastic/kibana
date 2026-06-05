# Demo slides - AI-Assisted PR Review with Domain Knowledge

> Companion to `demo-script.md`. Per-slide outlines for the 20-min slot. Slide text is what the audience sees; speaker notes are what you say. Screenshot capture and deck assembly are out of scope here — this is the spec, not the build.

## Slide deck overview

| # | Slide | When | Block |
|---|---|---|---|
| 0 | Real-PR proof — two from our backlog | ~0:03:00 | Real-PR comparisons opener |
| 1a | #271722 — `rulesClient.bulkCreate()` | ~0:03:30 | Real-PR comparisons (1st PR) |
| 1b | #272038 — Move install/upgrade/revert into `DetectionRulesClient` | ~0:05:30 | Real-PR comparisons (2nd PR) |
| 2 | How domain discovery works | ~0:08:00 | How it works |
| 3 | Anatomy of a domain knowledge file | ~0:10:30 | How it works (recap) |
| 4 | Smart is not the same as informed | ~0:11:00 | Why AI needs specific info |

The planted-PR walkthrough at 0:15–0:19 does not use slides — it is a live browser walkthrough of GitHub comments. Specific comments to walk are listed at the end of this doc under "Comment IDs for the planted-PR walkthrough".

---

## Slide 0 — Real-PR proof — two from our backlog

- **Purpose**: 20–30 sec framing card before per-PR slides. Sets up the "same skill, same code, two clones" framing.
- **Layout**: title at top, 3 bullets, small 4-card grid at the bottom (two highlighted, two greyed).
- **Slide text**:
  - **Title**: "Real-PR proof — two from our backlog"
  - **Bullets**:
    - Same skill: `/dex-review-code`
    - Same code, two clones — the only difference is the `.agents/domains/` folder
    - Four PRs reviewed; we'll walk two
  - **Bottom grid (small PR cards, no engineer names)**:
    - ⭐ #271722 — `rulesClient.bulkCreate()` *(today)*
    - ⭐ #272038 — Move install/upgrade/revert into `DetectionRulesClient` *(today)*
    - (greyed) #268165 — Refine rules `_search`, `_review` API contracts
    - (greyed) #269617 — MVP UI for rule changes history
- **Speaker note**: "*Before we look at the live run, here's what the same skill produces on real, merged PRs from this team's last few weeks. Two clones, only difference is the domain folder. I'll walk two of these and we can come back to the others in the hands-on.*"

---

## Slide 1a — PR #271722 (`rulesClient.bulkCreate()`)

- **Purpose**: Show that the domain reviewer *cites the seed PR (#262307) by name* on a real-world catch. The strongest narrative beat in the deck.
- **Layout**: PR title + number at top; two columns *WITHOUT (left) | WITH (right)*; two quote pairs stacked vertically; small footer.
- **Slide text**:
  - **Title**: "#271722 — `rulesClient.bulkCreate()` *(Steven)*"
  - **Subtitle**: Bulk rule creation in the alerting layer + Security Solution wiring

  | WITHOUT domain | WITH domain |
  |---|---|
  | **Quote 1**: *"KQL injection via `rule_id` — `escapeKql` only escapes `\` and `\"` but not other KQL special characters; a `rule_id` containing `)` or `*` distorts the generated filter…"* | **Quote 1**: *"**Domain catch: data-model leakage.** The KQL filter string `alert.attributes.params.ruleId` in `bulk_import_rules.ts` hardcodes the SO internal attribute path. … the exact pattern called out in **PR #262307 Historical Catch**."* |
  | **Quote 2**: *"Unbounded `perPage: ruleIds.length` — at 10,000 rules this silently hits ES's `max_result_window`…"* + *"`routeLimitedConcurrencyTag(1)` limits all users to a single concurrent import request cluster-wide, which is a significant throughput regression."* | **Quote 2**: *"**Domain invariant: heavy endpoints must rate-limit.** `RULE_MANAGEMENT_IMPORT_CONCURRENCY = 1` … completely serializes import requests across all spaces on a node. At MSSP scale (300 spaces), this could produce request queuing far exceeding the 1-hour socket timeout."* |

  - **Footer (small)**: "*Same code. Without domain: 'fix the escape, raise the concurrency'. With domain: 'this is the pattern that bit us in PR #262307'.*"
- **Speaker punchline** (notes, not on slide): "*The AI tells you which PR you got bitten by.*"

---

## Slide 1b — PR #272038 (Refactor into `DetectionRulesClient`)

- **Purpose**: Show domain finds *architectural* issues — abstraction-boundary leakage and scale anti-patterns getting frozen into the interface — that generic doesn't even know to look for.
- **Layout**: same two-column quote-pair as Slide 1a.
- **Slide text**:
  - **Title**: "#272038 — Move prebuilt rule install/upgrade/revert into `DetectionRulesClient` *(Maxim)*"
  - **Subtitle**: Refactor pulling code into the central abstraction

  | WITHOUT domain | WITH domain |
  |---|---|
  | **Quote 1**: *"Type coercion without compile-time safety: `upgradableRules as unknown as RuleUpgradeSpecifier[]` in `upgrade_all_prebuilt_rules.ts` silently reinterprets `RuleVersionSpecifier[]`."* | **Quote 1**: *"**Domain invariant: abstraction-boundary leakage in public interface.** `UpgradePrebuiltRulesResult.ruleUpgradeContexts` exposes `Map<string, RuleUpgradeContext>` where `RuleUpgradeContext` is an internal implementation type from a sibling domain's handler-level module. The `IDetectionRulesClient` interface is the abstraction boundary — leaking an internal handler type through it couples the abstraction to its own implementation."* |
  | **Quote 2**: *"Missing `ruleUpgrade` action in change-tracking: `upgrade_prebuilt_rules.ts` omits `action: SecurityRuleChangeTrackingAction.ruleUpgrade` from the `changeTracking` object."* | **Quote 2**: *"**Domain catch: batched-loop pattern persists in new bulk methods.** Both `installPrebuiltRules` and `upgradePrebuiltRules` use `while (queue.length > 0) + initPromisePool` instead of true-bulk AF primitives. The pattern is now officially part of the `IDetectionRulesClient` contract."* |

  - **Footer (small)**: "*Generic finds the bugs. Domain finds the bugs PLUS the design issues that travel with the refactor.*"
- **Speaker punchline** (notes): "*The architectural smells the engineer who owns this code would catch — that's what domain knowledge gives the AI.*"

---

## Slide 2 — How domain discovery works

- **Purpose**: 60–90 sec demystification. Audience should leave able to draw this flow themselves.
- **Layout**: horizontal 4-box flow diagram with single-line caption under each box.
- **Slide text**:
  - **Title**: "How domain discovery works"
  - **Flow** (left → right):

```
┌───────────────┐     ┌────────────────┐     ┌────────────────┐     ┌─────────────────┐
│  git diff     │ ──▶ │  matched paths │ ──▶ │  loaded domain │ ──▶ │ reviewer agent  │
│  origin/main  │     │  ∩ registered  │     │  domain.json   │     │ tagged comments │
│               │     │  domains       │     │  + .md files   │     │ w/ invariants   │
└───────────────┘     └────────────────┘     └────────────────┘     └─────────────────┘
```

  - **Captions under boxes** (one line each):
    - "Diff your branch"
    - "Intersect with registered domains"
    - "Load the matching domain's knowledge"
    - "Reviewer subagent emits comments tagged with invariants"
- **Speaker note**: "*That's the whole mechanism. There's no special model, no fine-tuning. The skill diffs your branch, finds which domain folder your changes intersect, loads the markdown, and hands it to a reviewer subagent. Same model, much better answer.*"

---

## Slide 3 — Anatomy of a domain knowledge file

- **Purpose**: 20–30 sec recap so audience knows what they'd write in the hands-on.
- **Layout**: side-by-side panels.
- **Slide text**:
  - **Title**: "Anatomy of a domain knowledge file"

```
┌─ domain.json ─────────────────┐    ┌─ detection-rule-management.md ─┐
│ {                             │    │  # Overview                     │
│   "slug": "detection-...",    │    │  # Architectural invariants     │
│   "name": "...",              │    │  # Common review patterns       │
│   "owners": [...],            │    │  # Security considerations      │
│   "paths": [...],             │    │  # Performance constraints      │
│   "knowledge_files": [        │    │  # Historical catches           │
│     "detection-rule-mgmt.md"  │    │                                 │
│   ]                           │    │                                 │
│ }                             │    │                                 │
└───────────────────────────────┘    └─────────────────────────────────┘
```

  - **Bottom bullet**: "*Captured with `/dex-domain-capture` — 30–60 min one-time, then it pays off on every review.*"
- **Speaker note**: "*Two files, that's the whole format. The `.json` is the entry-point — where in the repo it applies. The `.md` is what the reviewer agent reads. Anyone on your team can write these.*"

---

## Slide 4 — Smart is not the same as informed

- **Purpose**: The take-home line. Drive the underrated point.
- **Layout**: big centered headline + three indented bullets + small closing line.
- **Slide text**:
  - **Headline**: **"Smart is not the same as informed."**
  - **Three bullets**:
    - **The abstraction** — The model doesn't know that `IDetectionRulesClient` is **the** boundary in our domain.
    - **The history** — It doesn't know we got burned by an `as`-cast on `lastRunStatus` in PR #262307.
    - **The scale** — It doesn't know MSSP customers run 300 spaces × 10,000 rules per space.
  - **Closing line (smaller, bottom)**: "*Review quality scales with the quality of what you tell it. `dex-dev-skills` is the library where these reviews live.*"
- **Speaker note**: "*This is the part I think is underrated. LLMs are smart. They are. But smart is not the same as informed. The three things on this slide — the abstraction, the history, the scale — none of them are derivable from the code. We had to tell the AI. And once we did, it caught things it never could have caught before.*"

---

## Comment IDs for the planted-PR walkthrough (0:15–0:19)

Reference card for the GitHub walkthrough. Open PR #272773; expand each review; find each comment by file path + line. Read the **bold** sentence aloud, paraphrase the rest.

### WITH DOMAIN review — 3 comments to walk

**Comment A — API contract leakage** (~40 sec)
- **File / line**: `x-pack/.../common/api/detection_engine/rule_management/birthdays_today/birthdays_today_route.gen.ts:43`
  - Alt: `birthdays_today_route.schema.yaml:56` (same comment, different file)
- **Read aloud**: *"**Domain invariant: API contract must never expose SO/AF storage shape.** The response fields `alertTypeId`, `createdBy`, `createdAt`, and `lastRun` are AF/SavedObject internal attribute names in camelCase. The canonical `RuleResponse` contract uses snake_case and domain names: `rule_type_id`, `created_by`, `created_at`. Shipping these camelCase AF internals as a public API contract leaks the storage layer and freezes it — once shipped, callers depend on these names."*
- **Punchline**: "*This is the canonical contract. The AI knows it because we told it.*"

**Comment B — `RulesClient` bypass** (~40 sec)
- **File / line**: `x-pack/.../server/lib/detection_engine/rule_management/api/rules/birthdays_today/utils/birthday_helper.ts:60`
- **Read aloud**: *"**Domain invariant: never bypass the abstraction.** `findCelebratingRules` calls `esClient.search()` directly against `.kibana_alerting_cases`, bypassing AF's `RulesClient` entirely. The invariant is explicit: 'Detection rules are read/written **only** through AF's `RulesClient`'. Direct ES access is the most severe form of abstraction bypass in this domain — it skips RBAC enforcement, space isolation, SO model versioning, and any hook that `RulesClient.find` applies."*
- **Punchline**: "*'The single hardest rule in the domain.' That's a phrase a senior engineer on my team would actually use.*"

**Comment C — Bulk anti-pattern** (~40 sec)
- **File / line**: `x-pack/.../server/lib/detection_engine/rule_management/api/rules/bulk_actions/route.ts:493`
- **Read aloud**: *"**Domain invariant: bulk endpoints must do true bulk under the hood.** The `birthday_celebrate` action wraps `rulesClient.bulkEdit` inside `initPromisePool`, calling it once per rule with `ids: [rule.id]` — that is N individual `bulkEdit` calls, not one true-bulk call. The domain knowledge is explicit: 'New bulk endpoints must call true-bulk primitives (`RulesClient.bulkEdit`, etc.), not loop with `p-map` / promise-pool / async-batching.'"*
- **Punchline**: "*This is what doesn't work for MSSP customers. The AI knows the scale constraint because we told it.*"

### WITHOUT DOMAIN review — 3 comments to walk

**Comment D — `Math.random()` in production data path** (~30 sec)
- **File / line**: `x-pack/.../server/lib/detection_engine/rule_management/api/rules/birthdays_today/utils/birthday_helper.ts:100`
- **Read aloud**: *"`computeAgeYears` adds a random number of extra years (`Math.floor(Math.random() * 5) + 1`) to make the age 'more festive'. This means the same rule returns a different age on every request, every API call will be non-deterministic, and there is no way to write a deterministic test for this function."*
- **Note**: a real bug. Worth fixing. But this is the kind of thing a careful engineer would also notice in 30 sec — no domain expertise required.

**Comment E — Missing date validation** (~30 sec)
- **File / line**: `x-pack/.../server/lib/detection_engine/rule_management/api/rules/birthdays_today/route.ts:53`
- **Read aloud**: *"`birthdayDate` from the query string is accepted as any string and then split on `-` with no format validation. If a caller sends `birthdayDate=not-a-date` the `parts` array will contain `NaN` values that silently propagate into `month` and `day`, causing the query to match nothing. Add a regex constraint like `z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/)`."*
- **Note**: a real bug. Worth fixing. Generic AI tooling catches this just fine.

**Comment F — Silent truncation at 1000 rules** (~30 sec)
- **File / line**: `x-pack/.../server/lib/detection_engine/rule_management/api/rules/birthdays_today/utils/birthday_helper.ts:50`
- **Read aloud**: *"`findCelebratingRules` issues an uncapped `size: 1000` query against `.kibana_alerting_cases` and then filters birthday matches in memory. As the number of SIEM rules grows this will return at most 1000 rules regardless of actual count (silent truncation), and impose a fixed 1000-doc memory/network overhead on every page load."*
- **Note**: a real bug. Notice what's *not* in this comment: no mention of `RulesClient`, no mention of why `.kibana_alerting_cases` is the wrong index to talk to directly, no MSSP-scale framing. It's a perf/correctness comment, not a domain comment.

### Closing line (after all 6)

*"Generic catches real bugs — `Math.random()` in production, missing validation, silent truncation. Those are all worth fixing. But none of them name an architectural invariant. None of them cite the abstraction, the canonical converter, or the historical catch. That's the gap domain knowledge closes."*

---

## Optional / bench

Use only if time allows.

### Optional Slide — #268165 mini-comparison (15 sec)

If you want a 3rd PR data point in the elastic block, mention #268165 verbally (no slide): *"On #268165, the same comparison — generic flagged the dropped per-item length cap; domain additionally flagged the `Record<string, unknown>` + `as` cast on the aggregation result. That cast is the exact pattern from PR #262307's `lastRunStatus` thread. Three out of four PRs, same shape of result."*

### Optional 4th GitHub comment (after Comment C)

If you've banked ~30 sec extra, walk one more WITH DOMAIN comment to drive the abstraction point harder:

- **File / line**: `x-pack/.../server/lib/detection_engine/rule_management/api/rules/birthdays_today/utils/birthday_helper.ts:94`
- **Read aloud**: *"**Domain invariant: business logic lives in clients, never in route handlers or `utils/`.** `findCelebratingRules`, `computeAgeYears`, and `buildBirthdayMessage` implement the feature's core logic but are placed in a `utils/birthday_helper.ts` file beneath the route. This is the *utils anti-pattern* that the domain knowledge explicitly names as something to refuse on review. Business logic belongs behind `IDetectionRulesClient`, not in a `utils/` helper that only the route handler calls."*
- **Punchline**: "*The AI named the anti-pattern. That's only possible because we wrote it down.*"
