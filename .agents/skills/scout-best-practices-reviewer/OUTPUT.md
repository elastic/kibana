# Default output format

Use this format when invoking the Scout Best Practices Reviewer skill directly (for example, a developer running the review locally). Callers that supply their own output format (macroscope configs, Bugbot, CI bots) should follow those instructions instead.

Output **only** the applicable sections below. Use headings and lists (**no tables**). Group issues by priority: `blocker` → `major` → `minor` → `nit`. Omit empty priorities.

Finding titles should be short, easy-to-skim phrases that capture the fix or risk — **not** the full checklist heading. If the linked best practice is relevant, cite/link it briefly in the explanation.

When a finding comes from a **Critical check**, format its title as a level-3 heading and prefix it with `⚠️`:

```md
### ⚠️ <short fix-oriented title>
```

## 1. Findings

### Blocker

### ⚠️ <short fix-oriented title>  <!-- Critical check only; otherwise use the bullet form below -->
  - **Explanation**: <1-3 concise, actionable sentences, optionally citing/linking the linked best practice when useful>
  - **Evidence**: `<file:line>` (add multiple as needed)
  - **Suggested change**: <Specific code edit; include a small snippet if helpful>

- **<short fix-oriented title>**
  - **Explanation**: <1-3 concise, actionable sentences, optionally citing/linking the linked best practice when useful>
  - **Evidence**: `<file:line>` (add multiple as needed)
  - **Suggested change**: <Specific code edit; include a small snippet if helpful>

### Major

- **<short fix-oriented title>**
  - **Explanation**: <...; optionally cite/link the linked best practice when useful>
  - **Evidence**: `<file:line>`
  - **Suggested change**: <...>

### Minor

- **<short fix-oriented title>**
  - **Explanation**: <...; optionally cite/link the linked best practice when useful>
  - **Evidence**: `<file:line>`
  - **Suggested change**: <...>

### Nit

- **<short fix-oriented title>**
  - **Explanation**: <...; optionally cite/link the linked best practice when useful>
  - **Evidence**: `<file:line>`
  - **Suggested change**: <...>

## 2. Migration parity (only if a test migration is detected and action is required)

Include this section only when the PR removes/changes FTR tests alongside new/changed Scout specs **and** you found at least one parity issue that requires someone to step in (code change or an explicit de-scope/sign-off decision).
Do **not** output an FYI parity map. If everything is equivalent (or differences are clearly benign), omit this section.

### Blocker / Major / Minor / Nit

- **<short fix-oriented title> — <scenario name>**
  - **Issue**: <Coverage gap or behavior delta that needs action>
  - **Old behavior**: <...>
  - **New behavior**: <...>
  - **Why it matters**: <1-2 sentences on risk/coverage impact>
  - **Suggested fix / decision**: <Required. Either a code change or an explicit de-scope/sign-off the reviewer must confirm.>
  - **Evidence**: `<file:line>`
