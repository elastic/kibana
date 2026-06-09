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
  - (2m) 4.2: Smart is not the same as informed
  - (1m) 4.3: Thanks and outro

## Section 1: Opening

### 1.1: Welcome and intro (2m)

Goal: thank attendees, state the demo claim, frame the structure, set an honesty expectation.

> "Hi everyone - thanks for being here. I'm Georgii, Tech Lead for the Detection Engineering team. Before we move on to the actual hands-on part of the workshop, I've got a 20-minute demo.
>
> Here's the concept, or claim we want to make: **a code-review agent that knows your domain (rules of your codebase area) finds different - and often more important - issues than a generic one.** Same PR, same model. The only difference is whether the agent has a domain knowledge file loaded. My goal is to prove this concept by the end of the demo.
>
> We'll prove it using a few PRs and a code review skill. I have one fake feature PR with intentionally introduced mistakes. I also have a couple real draft PRs opened by my team recently. We'll run the code review skill live and will see how it works. While it's running in the backgroung, we'll go through some pre-posted code reviews and compare a generic review vs a domain-aware review, per each PR.

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

> "Generic catches real bugs - `Math.random()` in production, missing validation, silent truncation. Those are all worth fixing. But none of them called out a major architectural issue, an issue with performance, or a violated invariant. That's the gap domain knowledge closes."

### 2.2: Real PRs review comparisons (3m)

Goal: prove the same skill works on real merged PRs. Slide-driven; two PRs, ~75s each.

[Action: switch to slides → **Slide 0**.]

> "That was a fake PR. So how does the same skill perform on real engineering work? Let me show you two PRs my team has opened recently."

(~20s on Slide 0 framing - "*Same skill, same code, two clones - the only difference is the `.agents/domains/` folder. Four PRs reviewed; we'll walk two.*")

[Action: switch to **Slide 1a**.]

#### Slide 1a - PR #271722 (`rulesClient.bulkCreate()`) (~70s)

> "PR #271722. Bulk rule creation in the alerting layer. Both reviewers flagged the **same architectural decision** - the import endpoint sets `routeLimitedConcurrencyTag(1)`, which serializes all imports cluster-wide.
>
> Look at the difference in framing.
>
> The **generic review** on the left says: 'limiting to 1 globally is extremely aggressive - consider raising it.' That's a valid concern. It's also a one-liner: 'this is too low, bump it up.'
>
> The **domain review** on the right says: 'Domain invariant - heavy endpoints must rate-limit. The import route is one of four hot paths. MSSP customers run 300 spaces per cluster. With concurrency 1, a single long-running import on any space blocks all other concurrent imports on that node.' And it goes one step further: 'consider whether a limit of 3 to 5 would still bound memory without completely serializing multi-space imports.'
>
> Same code. Generic says 'aggressive, raise it.' Domain says 'this disables bulk imports for MSSP customers - here's why, here's the lower bound, here's the upper bound.'"

[Action: switch to **Slide 1b**.]

#### Slide 1b - PR #272038 (Move install/upgrade/revert into `DetectionRulesClient`) (~80s)

> "Second PR. This one is a refactor - pulling install, upgrade, and revert operations into a central `DetectionRulesClient` abstraction.
>
> **Top row** - both reviewers caught the **same issue**: the install step goes through `DetectionRulesClient`, but the upgrade step bypasses it and calls `applyPrebuiltRuleAssets` directly. Generic catches it. Domain catches it. Parity at the surface.
>
> **Bottom row** - only the domain reviewer caught this one. The new public `IDetectionRulesClient` interface is leaking a type called `RuleUpgradeContext` - an internal implementation type from a sibling domain's handler-level module. That's an abstraction-boundary leak. Generic has no analog - it doesn't know `IDetectionRulesClient` is the boundary.
>
> Both reviewers caught the obvious DRC-bypass. Only the domain reviewer noticed the public interface is leaking a sibling-domain handler-level type. That's the kind of catch only an owner of this code would make."

## Section 3: How it works

### 3.1: How code review with domain knowledge actually works (5m)

Goal: four sub-blocks at high level. Attendees should leave able to draw the discovery flow themselves and know that two simple files drive the whole thing.

> "So - how does code review with domain knowledge actually work?"

#### (a) Where the files live (~1:00)

[Action: switch to editor. Open `x-pack/solutions/security/plugins/security_solution/.agents/domains/detection-engineering/rule-management/` in the file tree.]

> "Quick tour. This is where the domain knowledge lives for the rule-management area - checked into the Kibana repo under `.agents/domains/`. Two files: `domain.json` - the entry-point manifest - and `detection-rule-management.md` - the actual knowledge content."

[Action: briefly open `domain.json`.]

> "The discovery mechanism - which paths in the repo this domain applies to, which knowledge files to load - lives in two places. The repo-checked catalog is `dex-dev-skills/skills/knowledge/domains/domain-catalog.json`. You can also override per-developer with a local file at `~/.dex-dev-skills/assets/domains/domain-catalog.json`. Both supported."

#### (b) Anatomy of a knowledge file (~1:00)

[Action: switch to **Slide 3** - the anatomy side-by-side.]

> "Two files, that's the whole format. The `.json` is the entry-point - where in the repo it applies, who owns it, which markdown files to load. The `.md` is what the reviewer agent reads."

[Action: switch back to editor, open `detection-rule-management.md`, scroll the section headers.]

> "The markdown isn't free-form prose. It has structured sections: Overview, Architectural invariants, Common review patterns, Security considerations, Performance constraints, Historical catches. That structure is what makes the reviewer subagent's output useful - each comment maps back to a section.
>
> Anyone on your team can write these. Same format across every domain."

#### (c) Discovery flow + `/dex-review-code` internals (~2:00)

[Action: switch to **Slide 2** - the discovery flow diagram.]

> "When you run `/dex-review-code`, here's what happens. Step 1 - diff your branch against `origin/main`. Step 2 - intersect the changed paths with the registered domains in the catalog. Step 3 - load that domain's `.md` files into the reviewer subagent's context. Step 4 - the subagent emits comments, each tagged with the invariant it's flagging.
>
> That's the whole mechanism. No special model, no fine-tuning. Same model in both terminals - only the loaded context differs.
>
> One thing worth saying: `/dex-review-code` is not one big monolithic agent. It runs in phases - a diff phase, a domain-match phase, then a multi-agent review dispatch where each matched domain gets its own reviewer subagent with its own loaded knowledge file. That's why the domain reviewer sounds different - different subagent, different system prompt loaded from the markdown."

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

[Action: in WITH DOMAIN terminal:]

```bash
cat ~/.dex-dev-skills/work/.../review-comments.md | head -40
```

> "~10 comments. Mostly tagged `Domain invariant` or `Domain catch`. Each maps back to a section in the knowledge file."

[Action: in WITHOUT DOMAIN terminal, same command.]

> "Fewer comments - mostly style, nullability, and a couple real bugs. None of them name an architectural invariant.
>
> Same pattern you saw on GitHub. These can be posted via `/dex-review-post` - exactly what you'll do in the hands-on right after this."

### 4.2: Smart is not the same as informed (2m)

Goal: land the principle. The synthesizing close.

[Action: switch to **Slide 4**.]

> "Here's the principle I want you to leave with. Three words on the slide:
>
> **Smart is not the same as informed.**
>
> LLMs are smart. They are. But smart is not the same as informed. There are three specific things - pulled from this domain - that the model could not derive from the code alone, no matter how smart it was. We had to tell it."

[Action: walk the three bullets on Slide 4.]

> **"One - the abstraction.** The model has no way to know that `IDetectionRulesClient` is **the** boundary in our domain. It's not commented in the code. It's just an interface. We had to tell it.
>
> **Two - the history.** The model has no way to know we got burned by an `as`-cast on `lastRunStatus` in PR #262307 six months ago. That's not in the code. It's in our heads, in PR history, in design discussions on Slack. We had to mine that and write it down.
>
> **Three - the scale.** The model has no way to know MSSP customers run 300 Kibana spaces with up to 10,000 rules per space. The code looks fine at 100 rules. It only fails at 300 × 10,000. We had to tell it."

[Action: point at the supporting line on Slide 4.]

> "This is the take-away: **AI dev automation is as good as the quality and accuracy of the information you put in the context window.** That principle goes well beyond code review - it applies to any agentic AI development workflow your team builds. Domain knowledge is what makes the AI's smart actually become informed."

### 4.3: Thanks and outro (1m)

Goal: two takeaways, thanks, hand off to Nir.

> "Two takeaways before I hand it over.
>
> One - **domain knowledge is the difference** between a code review that wastes everyone's time and one you'd actually take seriously. The first names invariants; the second doesn't.
>
> Two - **30 to 60 minutes is all it takes** to capture domain knowledge for an area, using `/dex-domain-capture`. That's what you're about to do in the hands-on.
>
> Thank you for following along. Over to Nir to set you up."

[Action: hand microphone / clicker to Nir.]

## Risk mitigations & contingencies

### "A terminal hangs or fails mid-run"

- Don't debug live. The pre-posted reviews on PR #272773 are the primary evidence - they're shown at 2.1 (around minute 5–10), well before the live runs even need to be done. At 4.1, narrate plainly ("*looks like we hit a rate limit live*") and move on. The principle (4.2) doesn't depend on the live runs at all.

### "Both reviews take much longer than expected"

- Hard limit: if reviews are not done by 4.1 (~minute 18), skip the artifact previews entirely. Pivot directly to "*you'll see this same output in your own terminal in the hands-on*" and roll into 4.2.

### "Pre-posted review URLs on PR #272773 have drifted"

- Verify the two pre-posted review IDs the night before. The Comment-ID references in `demo-slides.md` map to specific GitHub anchor URLs; if anything drifted from a rebase, update the references.

### "Real-PR review links (#271722 / #272038) are mis-linked or stale"

- Both slide pairs link to GitHub via comment-IDs. Spot-check during prep; the curated IDs are stable as long as the underlying reviews aren't re-run.

### "An audience question lands in the middle of the demo"

- Defer to the hands-on. Canned response: "*Great question - let's hold that for the hands-on, where you can try it on your own PR.*"

### "An intentionally introduced violation doesn't get caught by the (live) domain reviewer"

- The pre-posted reviews on PR #272773 carry the proof; the live runs are atmosphere, not evidence. If the live WITH-domain run misses something at 4.1, don't call out the miss - focus on what was caught.

### "Audience asks: did the AI hallucinate or get things wrong?"

- Answer honestly. The candidate domain reviewer on PR #271722 had ~2 of 7 comments that were misleading - it invented a data-model leakage that didn't exist (the code is encapsulated inside `DetectionRulesClient`), and it referenced a `params` argument on `RulesClient.find` that doesn't exist. The 5 right ones were genuinely better than generic. The right framing: "*The AI is not always right. But when it's right, domain knowledge changes the **kind** of right.*"

### "PR has unexpected new comments at demo time"

- Refresh PR #272773 once before the demo and once during the WITH-DOMAIN expansion at 2.1. Don't refresh aggressively. If the line numbers in Comments A–F have drifted from a rebase, the comment text still resolves to the right code via GitHub's line-anchor fallback.
