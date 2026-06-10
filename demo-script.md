# Demo script - AI-Assisted PR Review with Domain Knowledge

## Overall structure and timing

21 min total:

- (4m) **Section 1: Opening**
  - (2m) 1.1: Welcome and intro
  - (1m) 1.2: Rule Birthdays 🎂
  - (1m) 1.3: Start live code review runs
- (8m) **Section 2: Review comparisons**
  - (5m) 2.1: Rule Birthdays PR review comparison
  - (3m) 2.2: Real PRs review comparisons
- (5m) **Section 3: How it works**
  - (5m) 3.1: How code review with domain knowledge actually works
- (4m) **Section 4: Synthesis & closing**
  - (1m) 4.1: Check live code review results
  - (1m) 4.2: Smart is not the same as informed
  - (1m) 4.3: What's in the context window is key
  - (1m) 4.4: Thanks and outro

## Section 1: Opening

### 1.1: Welcome and intro (2m)

Goal: thank attendees, state the demo claim, frame the structure, set an honesty expectation.

> "Hi everyone - thanks for being here. I'm Georgii, Tech Lead for the Detection Engineering team. Before we move on to the actual hands-on part of the workshop, I've got a 20-minute demo.
>
> Here's the concept, or claim we want to make: **a code-review agent that knows your domain (rules of your codebase area) finds different - and often more important - issues than a generic one.** Same PR, same model. The only difference is whether the agent has a domain knowledge file loaded. My goal is to prove this concept by the end of the demo.
>
> We'll prove it using a few PRs and a code review skill. I have one fake feature PR with intentionally introduced mistakes. I also have a couple real draft PRs opened by my team recently. We'll run the code review skill live and will see how it works. While it's running in the background, we'll go through some pre-posted code reviews and compare a generic review vs a domain-aware review, per each PR.

### 1.2: Rule Birthdays 🎂 (1m)

Goal: briefly show the feature and the PR. Do **not** enumerate the intentionally introduced mistakes.

[Action: switch to the running Kibana, Rule Management page opened.]

> "This is the feature we'll be reviewing. It's called Rule Birthdays. Very important feature requested by some of our biggest customers."
>
> "Every detection rule has a creation date. And this little feature shows which rules are celebrating their birthday today."
>
> "Of course it's a 100% fake feature, but it was built in the way we'd build a real one: a new API endpoint, a dedicated bulk action, and the UI."

[Action: switch to browser tab on PR [#272773](https://github.com/elastic/kibana/pull/272773).]

> "Here's the PR. We intentionally introduced some specific mistakes in it - but I'm **not** going to tell you which. Let's see what the AI will tell us."

[Action: scroll the PR description briefly. Then scroll a few diff chunks.]

### 1.3: Start live code review runs (1m)

Goal: kick off both terminals, wait till the skills spawn reviewer subagents, then move on without waiting for review completion.

> "Now let's run the code review skill against this PR."

[Action: switch to terminals.]

> "Two terminal panes. Kibana repo, two different clones, same PR checked out.
>
> - Top is for DOMAIN-AWARE review with domain knowledge
> - Bottom is GENERIC review without domain knowledge"

[Action: in each terminal, run:]

```text
/dex-review-code
```

[Action: click through the approval prompts in both terminals until you see subagents dispatched. ~30s.]

> "Both running. They'll take 5–7 minutes. Good news: we don't have to wait - these exact same reviews are already posted on GitHub from the two runs I did earlier. Let's go back to the PR and check them."

[Action: switch to browser, back to PR #272773.]

## Section 2: Review comparisons

### 2.1: Rule Birthdays PR review comparison (5m)

Goal: walk through **3 GENERIC comments** + **3 DOMAIN-AWARE comments** live on GitHub. The centerpiece of the demo. No slides - pure live walkthrough preserves momentum.

[Action: browser on PR #272773. Both reviews are labeled in the body header: 🎯 Domain-aware / 🤨 Generic.]

> "Same fake PR. Two pre-posted reviews: 🎯 Domain-aware and 🤨 Generic. Let's check the **GENERIC** review comments first."

#### Comment A - `Math.random()` in production (~30s)

> "`computeAgeYears` adds a random number of extra years - `Math.floor(Math.random() * 5) + 1` - to make the age 'more festive'. Same rule returns a different age on every request, every API call non-deterministic, no way to write a deterministic test.
>
> Real bug. Worth fixing. But notice - no domain language. Generic AI tooling catches this fine."

#### Comment B - missing date validation (~30s)

> "`birthdayDate` from the query string is accepted as any string and split on `-` with no format validation. If a caller sends `birthdayDate=not-a-date`, the parts array contains NaN values that silently propagate into the query. Add a regex constraint.
>
> Real bug. Generic catches."

#### Comment C - silent truncation at 1000 (~30s)

> "`findCelebratingRules` issues an uncapped `size: 1000` query against `.kibana_alerting_cases` and filters birthday matches in memory. As the number of rules grows this returns at most 1000 regardless of actual count - silent truncation.
>
> Real bug."

#### Transition (~20s)

> "OK - that was the GENERIC review comments. Now to the **DOMAIN-AWARE** review."

#### Comment D - API contract leakage (~40s)

> "First comment. File is `birthdays_today_route.gen.ts`. Read the headline:
>
> **Domain invariant: API contract must never expose SO/AF storage shape.** The response fields `alertTypeId`, `createdBy`, `createdAt`, and `lastRun` are AF/SavedObject internal attribute names in camelCase. The canonical `RuleResponse` contract uses snake_case domain names: `rule_type_id`, `created_by`, `created_at`. Shipping these camelCase AF internals as a public API leaks the storage layer and freezes it - once shipped, callers depend on these names.
>
> That's a senior reviewer's catch. The AI knows the canonical contract because we told it. No generic AI tool could surface this - the names look fine in isolation."

#### Comment E - `RulesClient` bypass (~40s)

[Action: click into comment on `birthday_helper.ts:60`.]

> "Next one. `birthday_helper.ts`, line 60.
>
> **Domain invariant: never bypass the abstraction.** `findCelebratingRules` calls `esClient.search()` directly against `.kibana_alerting_cases`, bypassing AF's `RulesClient` entirely. The invariant is explicit: 'Detection rules are read/written **only** through AF's `RulesClient`'. Direct ES access skips RBAC, space isolation, SO model versioning, and any hook `RulesClient.find` applies.
>
> 'The most severe form of abstraction bypass in this domain' - that's the kind of conviction only an engineer who's been burned by this would write. The AI inherits that voice from the knowledge file."

#### Comment F - bulk anti-pattern (~40s)

[Action: click into comment on `bulk_actions/route.ts:493`.]

> "Third one. `bulk_actions/route.ts`.
>
> **Domain invariant: bulk endpoints must do true bulk under the hood.** The `birthday_celebrate` action wraps `rulesClient.bulkEdit` inside `initPromisePool`, calling it once per rule with `ids: [rule.id]` - that's N individual `bulkEdit` calls, not one true-bulk call. The domain knowledge is explicit: new bulk endpoints must call true-bulk primitives.
>
> This is the kind of thing that doesn't break in CI. It breaks at MSSP scale - 300 spaces, 10,000 rules per space. The AI knows the scale constraint because we wrote it down."

#### Closing (~30s)

> "Generic catches real bugs - `Math.random()` in production, missing validation, silent truncation. Those are all worth fixing. But none of them named an architectural invariant, called out an abstraction being bypassed, or connected to a domain-specific scale concern. That's the gap domain knowledge closes."

### 2.2: Real PRs review comparisons (3m)

Goal: prove the same skill works on real merged PRs. Slide-driven; two PRs, ~75s each.

[Action: switch to slides → **"Real PR reviews" framing slide**.]

> "That was a fake PR. So how does the same skill perform on real engineering work? Let me show you two PRs my team has opened recently."

(~20s on framing slide)

[Action: switch to **#272038 parity-catch slide**.]

#### #272038 — parity catch (~50s)

https://github.com/elastic/kibana/pull/272038

> "First PR — #272038. This is a refactor: pulling install, upgrade, and revert into the central `DetectionRulesClient` abstraction.
>
> Both reviewers caught **the same issue**. The install step goes through `DetectionRulesClient`. The upgrade step bypasses it and calls `applyPrebuiltRuleAssets` directly. Inconsistent with the PR's own goal.
>
> Generic catches it. Domain-aware catches it. **Parity at the surface.**"

[Action: switch to **#272038 unpaired-catch slide**.]

#### #272038 — unpaired catch (~50s)

> "Same PR, different file. **Only the domain-aware reviewer caught this one.**
>
> The new public `IDetectionRulesClient` interface is leaking a type called `RuleUpgradeContext` — an internal implementation type from a sibling domain's handler-level module. That's an abstraction-boundary leak.
>
> Generic has no analog. It doesn't know `IDetectionRulesClient` is the boundary. It doesn't recognize `RuleUpgradeContext` as a sibling-domain handler-level type.
>
> **The kind of catch only an owner of this code would make** — and the domain-aware reviewer behaves like one because we told it where the boundary is."

[Action: switch to **#271722 slide**.]

#### #271722 (`rulesClient.bulkCreate()`) (~70s)

https://github.com/elastic/kibana/pull/271722

> "Second PR — #271722. Bulk rule creation in the alerting layer. Both reviewers flagged the **same architectural decision** — the import endpoint sets `routeLimitedConcurrencyTag(1)`, which serializes all imports cluster-wide.
>
> Look at the difference in framing.
>
> The **generic review** says: 'limiting to 1 globally is extremely aggressive — consider raising it.' Valid concern. Also a one-liner: 'this is too low, bump it up.'
>
> The **domain-aware review** says: 'Domain invariant — heavy endpoints must rate-limit. The import route is one of four hot paths. MSSP customers run 300 spaces per cluster. With concurrency 1, a single long-running import on any space blocks all other concurrent imports on that node.' And it goes one step further: 'consider whether a limit of 3 to 5 would still bound memory without completely serializing multi-space imports.'
>
> Same code. Generic: 'aggressive, raise it.' Domain-aware: 'this disables bulk imports for MSSP — here's why, here's the lower bound, here's the upper bound.'"

## Section 3: How it works

### 3.1: How code review with domain knowledge actually works (5m)

Goal: four sub-blocks at high level. Attendees should leave able to draw the discovery flow themselves and know that two simple files drive the whole thing.

> "So - how does code review with domain knowledge actually work?"

#### (a) Where the files live (~1:00)

[Action: switch to editor. Open `x-pack/solutions/security/plugins/security_solution/.agents/domains/detection-engineering/rule-management/` in the file tree.]

> "Quick tour. This is where the domain knowledge lives for the rule-management area - checked into the Kibana repo under `.agents/domains/`. Two files: `domain.json` - the entry-point manifest - and `detection-rule-management.md` - the actual knowledge content."

[Action: briefly open `domain.json`.]

> "The discovery mechanism - which paths in the repo this domain applies to, which knowledge files to load - lives in two places. The repo-checked catalog is `dex-dev-skills/skills/knowledge/domains/domain-catalog.json`. You can also override per-developer with a local file at `~/.dex-dev-skills/assets/domains/domain-catalog.json`. Both supported."

#### (b) Discovery flow + `/dex-review-code` internals (~2:00)

[Action: switch to the **"How domain knowledge discovery works"** slide (4-box flow).]

> "When you run `/dex-review-code`, here's what happens. Step 1 - diff your branch against `origin/main`. Step 2 - intersect the changed paths with the registered domains in the catalog. Step 3 - load the matching domain's knowledge - `domain.json` plus its `.md` files - into the reviewer subagent's context. Step 4 - the subagent emits comments, each tagged with the invariant it's flagging.
>
> That's the whole mechanism. No special model, no fine-tuning. Same model in both terminals - only the loaded context differs.
>
> One thing worth saying: `/dex-review-code` is not one big monolithic agent. It runs in phases - a diff phase, a domain-match phase, then a multi-agent review dispatch where each matched domain gets its own reviewer subagent with its own loaded knowledge file. That's why the domain-aware reviewer sounds different - different subagent, different system prompt loaded from the markdown."

#### (c) Anatomy of a knowledge file (~1:00)

[Action: switch to the **"Anatomy of a domain knowledge file"** slide (two-panel side-by-side).]

> "Two files, that's the whole format. The `.json` is the entry-point - the domain's slug and name, who owns it, which paths in the repo it applies to, and which knowledge files to load. The `.md` is what the reviewer agent actually reads."

[Action: switch back to editor, open `detection-rule-management.md`, scroll the section headers.]

> "The markdown isn't free-form prose. It has structured sections: Overview, Architectural invariants, Common review patterns, Security considerations, Performance constraints, Historical catches. That structure is what makes the reviewer subagent's output useful - each comment maps back to a section.
>
> Anyone on your team can write these. Same format across every domain."

#### (d) Where these files came from (~1:00)

> "Last question: where does the knowledge file itself come from? You don't write it by hand.
>
> There's a sibling skill called `/dex-domain-capture`. It runs in three phases - an automated code scan that traces the abstractions in your area, an automated PR-mining pass that reads your team's last few months of PRs and pulls out the patterns that recurred, and then a structured interview with the domain owner - typically a senior engineer on the team - that fills in the historical catches and architectural opinions.
>
> 30 to 60 minutes, one-time investment per domain. After that, every PR review in that area benefits. You'll try `/dex-domain-capture` yourself in the hands-on right after this demo."

## Section 4: Synthesis & closing

### 4.1: Check live code review results (1m)

Goal: quick callback to the runs we kicked off at 1.3. Reinforces "this is reproducible - you'll do it in the hands-on".

[Action: switch back to terminals.]

> "Remember the two live runs we kicked off at the start? Let me check."

[Action: glance at both terminals. **If both are at `Code review complete. Artifacts in: ...`** - show the output:]

[Action: in DOMAIN-AWARE terminal:]

```bash
cat ~/.dex-dev-skills/work/.../review-comments.md | head -40
```

> "~10 comments. Mostly tagged `Domain invariant` or `Domain catch`. Each maps back to a section in the knowledge file."

[Action: in GENERIC terminal, same command.]

> "Fewer comments - mostly style, nullability, and a couple real bugs. None of them name an architectural invariant.
>
> Same pattern you saw on GitHub. These can be posted via `/dex-review-post` - exactly what you'll do in the hands-on right after this."

### 4.2: Smart is not the same as informed (1m30s)

Goal: land the headline. Walk the three things the model could not derive from code alone.

[Action: switch to the **"Smart is not the same as informed"** slide.]

> "Here's the headline I want you to leave with:
>
> **Smart is not the same as informed.**
>
> LLMs are smart. They are. But smart is not the same as informed. There are three specific things - pulled from this domain - that the model could not derive from the code alone, no matter how smart it was. We had to tell it."

[Action: walk the three takeaways on the slide.]

> **"One - the rules.** The model has no way to know that `IDetectionRulesClient` is **the** business logic abstraction in our domain. It's not commented in the code. It's just an interface. We had to tell it.
>
> **Two - the history.** The model has no way to know we got burned in the past by exposing the data model directly via API endpoints - a pattern that froze our storage shape into a public contract. That's not in the code. It's in PR history, in Slack threads, in post-mortems. We had to mine that and write it down.
>
> **Three - the scale.** The model has no way to know our largest MSSP customers run 300 Kibana spaces with up to 3,000 rules per space, and need concurrent bulk actions across those spaces. The code looks fine at 100 rules. It only fails at 300 × 3,000. We had to tell it."

### 4.3: What's in the context window is key (1m15s)

Goal: zoom out from "domain knowledge" to the broader principle, then name the three context categories the team should be filling in over time.

[Action: switch to the **"What's in the context window is key"** slide.]

> "Zoom out one level. The take-away isn't just 'write domain knowledge files.' It's this:
>
> **An AI agent is as good as the quality and accuracy of the information you put in its context window.**
>
> That goes well beyond code review. It applies to any agentic AI development workflow your team builds - review, refactoring, generation, planning, on-call triage. The ceiling on quality is what you've made *available* to the agent in context. Domain knowledge is one slice of that. There are at least three categories worth building up over time:"

[Action: walk the three takeaways on the slide.]

> **"Domain knowledge** - today, mostly missing. Tomorrow, sufficient for the highest-impact areas. Eventually, comprehensive and accurate across every team.
>
> **Team standards** - the cross-domain rules and guidelines that apply regardless of which file you're touching: testing discipline, error handling conventions, security defaults.
>
> **Decision log** - *why* certain decisions were made. Not what the code does - the code shows that. The reasoning behind it. Why we picked approach A over B. Why this constraint exists. What we tried and abandoned.
>
> Build all three over time, and your AI tooling stops being 'a smart assistant that doesn't know your codebase' and starts being 'an informed collaborator.'"

### 4.4: Thanks and outro (1m)

Goal: two takeaways, thanks, hand off to Nir.

> "Two takeaways before I hand it over.
>
> One - **domain knowledge is the difference** between a code review that wastes everyone's time and one you'd actually take seriously. The first names invariants; the second doesn't.
>
> Two - **30 to 60 minutes is all it takes** to capture domain knowledge for an area, using `/dex-domain-capture`. That's what you're about to do in the hands-on.
>
> Thank you for following along. Over to Nir to set you up."

[Action: hand microphone / clicker to Nir.]

