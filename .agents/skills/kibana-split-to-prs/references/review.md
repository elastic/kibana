# Review product

A PR is a **review product**, not a git hunk. Canonical vocabulary:

| Term | Meaning |
|------|---------|
| **One question** | Single sentence the reviewer decides—not a file list; split if "and" joins unrelated concerns |
| **One owner** | Primary `@elastic/team`; secondary minimal and named |
| **Planned validation** | `node scripts/check --scope branch --base-ref upstream/main`; outcome only after Phase 5 commit |
| **No hidden risk** | Surprise audit empty or every surprise named + hinted |
| **Bucket** | `low risk` \| `needs scrutiny`—review surface, not approval urgency |

Apply to each PR after slicing, before Phase 3. Fail → reslice or `NEEDS DECISION`.

**Pass when:** scannable (title + question + tags tell the story); standalone readable (no later PR required); single-pass review (assessable without rest of stack).

## Buckets

| Bucket | Signals |
|--------|---------|
| **Low risk** | Attention `low`, ≤2 tags, mechanical or dark-ship off |
| **Needs scrutiny** | Attention `medium`/`high`, `privileges`, `saved-objects`, `http-api`, `concurrency`, flip PR |

Do not hide needs scrutiny inside low risk.

## Hidden risk

*What would make a reviewer say "I didn't expect that"?*

| Risk | Fix |
|------|-----|
| Trojan mechanical | Split behavioral hunk |
| Silent default | Own PR or `config` tag + hint |
| Type-only runtime change | `public-api` + call-site hint |
| Cross-stack file | Reslice, extract, hunk map ([slicing.md](slicing.md) §hotspots) |
| Stack-only readable | **Out of scope** + standalone narrative |
| Deferred validation | Name check or run on branch |
| Owner mismatch | Split or document coupling |
| Drive-by fixes / unrelated tags in one PR | Remove or split |
| Cross-PR hunks without map | Reslice or map |

Record in **Surprise audit** (`None identified` if empty).

## Stack self-check

Titles + questions predict the arc? ≤5 PRs or documented why? Same file 3+ re-reads → extract or exception? No silent leftover hunks?

## Risk tags

Tag every applicable area. Prefer 1–3; more → split further.

`public-api`, `http-api`, `saved-objects` (one model version per type per PR), `privileges`, `auth`, `concurrency`, `state-machine`, `config`, `ui`, `a11y`, `i18n`, `plugin-entry`, `dependencies`, `tests`, `generated`, `noise`

## Hints

Imperative, short; files/symbols; tie to review question. No ignore lists or diff prose.

| Signal | Attention |
|--------|-----------|
| ~80 lines privilege mapping | high |
| ~800 lines moves | low (`noise`) |
| HTTP route + authz | high |
| `useNew = false` + new impl | medium |
| Flip PR | low–medium |

## PR blurb (generate when opening PRs, not required in plan)

```
<One-line summary>
Review question: <question>
Stack: n/N
```

Optional: `Focus: <hint>`. If check passed: may note `node scripts/check` passed—verification only, not skip review.
