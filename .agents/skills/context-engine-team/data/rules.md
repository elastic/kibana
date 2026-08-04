# Review Process Rules

Operational rules for conducting PR reviews. These govern the review process itself, not what to look for (see `review_criteria.md` and `personas/`).

## Review Priority Order

Evaluate findings in this order. Higher-priority issues should be reported even if lower-priority analysis is incomplete.

1. **Security** - Vulnerabilities, auth gaps, data exposure
2. **Correctness** - Bugs, logic errors, race conditions
3. **Architecture** - Design flaws, API contract issues, breaking changes
4. **Performance** - Efficiency problems, scalability bottlenecks
5. **Quality** - Test coverage, code cleanup, UX, documentation

## Persona-Based Analysis

Every review runs through all 5 reviewer personas (see `personas/`). Each persona analyzes the diff independently from their perspective, then findings are merged and deduplicated.

- **Do not skip personas** even for small PRs. A 10-line change can have security implications.
- **Deduplicate across personas**. If both Correctness and Performance flag the same N+1 query, report it once under the most relevant category.
- **Preserve the highest severity**. If Security flags something as a blocker and Quality flags it as important, keep it as a blocker.

## Severity Calibration

### Blocker (must fix before merge)
- Any exploitable security vulnerability
- Logic bug that causes runtime failure, data loss, or incorrect behavior
- Breaking API change without migration path
- Missing `await` on async call in critical path
- O(n) ES/DB queries per user request (N+1 pattern)
- No tests for new user-facing feature

### Important (should fix before merge)
- Missing input validation at system boundaries
- Logic in the wrong architectural layer
- Missing error handling on external calls
- Missing edge case handling (empty arrays, null values)
- Aggressive polling/crawl intervals
- Race conditions in multi-node environments (check-then-act)
- Misleading API response fields

### Nit (nice to have, not blocking)
- Naming inconsistencies
- Unnecessary null guards on guaranteed-present values
- Import path style (relative vs absolute)
- Missing JSDoc on internal functions
- Empty method stubs without TODO comments
- Minor type inconsistencies that work at runtime

## Large PR Handling (>400 lines)

When a PR exceeds 400 changed lines:

1. **Suggest splitting** if the PR contains multiple independent concerns
2. **Review in logical chunks** - group by feature or module, not file alphabetically
3. **Architecture first** - evaluate design and structure before line-level issues
4. **Prioritize ruthlessly** - focus on blockers and important issues; skip nits on large PRs
5. **Note scope concerns** in the review summary if the PR mixes unrelated changes

## Communication Rules

- Frame findings as suggestions, not criticism: "Consider X because Y" not "This is wrong"
- Always explain **why** an issue matters, not just what is wrong
- Include a fix suggestion for every blocker and important finding
- Acknowledge good patterns and thoughtful design decisions
- Reference file:line for every finding so the author can navigate directly
