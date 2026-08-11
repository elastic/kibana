# Default output format

Use this format when invoking the Scout Best Practices Reviewer skill directly (for example, a developer running the review locally). Callers that supply their own output format (macroscope configs, Bugbot, CI bots) should follow those instructions instead.

Output **only** the applicable sections below. Use headings and lists (**no tables**). Group issues by priority: `blocker` → `major` → `minor` → `nit`. Omit empty priorities.

## 1. Findings

### Blocker

- **<Concern (use exact checklist heading)> — <short summary>**
  - **Explanation**: <1-3 concise, actionable sentences>
  - **Evidence**: `<file:line>` (add multiple as needed)
  - **Suggested change**: <Specific code edit; include a small snippet if helpful>

### Major

- **<Concern (use exact checklist heading)> — <short summary>**
  - **Explanation**: <...>
  - **Evidence**: `<file:line>`
  - **Suggested change**: <...>

### Minor

- **<Concern (use exact checklist heading)> — <short summary>**
  - **Explanation**: <...>
  - **Evidence**: `<file:line>`
  - **Suggested change**: <...>

### Nit

- **<Concern (use exact checklist heading)> — <short summary>**
  - **Explanation**: <...>
  - **Evidence**: `<file:line>`
  - **Suggested change**: <...>

## 2. Migration parity (only if a test migration is detected and action is required)

Include this section only when the PR removes/changes FTR tests alongside new/changed Scout specs **and** you found at least one parity issue that requires someone to step in (code change or an explicit de-scope/sign-off decision).
Do **not** output an FYI parity map. If everything is equivalent (or differences are clearly benign), omit this section.

### Blocker / Major / Minor / Nit

- **<Concern (use exact checklist heading)> — <scenario name>**
  - **Issue**: <Coverage gap or behavior delta that needs action>
  - **Old behavior**: <...>
  - **New behavior**: <...>
  - **Why it matters**: <1-2 sentences on risk/coverage impact>
  - **Suggested fix / decision**: <Required. Either a code change or an explicit de-scope/sign-off the reviewer must confirm.>
  - **Evidence**: `<file:line>`
