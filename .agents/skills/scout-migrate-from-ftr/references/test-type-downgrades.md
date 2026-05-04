# Test type downgrades

Not every FTR test should become a Scout UI test. Many should be downgraded to a Scout **API** test or a **unit/component test (RTL/Jest)**. This file is the catalog of criteria, used by:

- the planner step (step 1 of [`SKILL.md`](../SKILL.md)), to decide each test's target type and record the choice in the migration plan
- the execution step (steps 1 and 7 of [`migration-execution.md`](migration-execution.md)), when implementing or noticing a misclassification

## Decision matrix

| Target | Use when | Why |
|--------|---------|-----|
| **Scout UI test** | The flow requires a real browser **and** a running server (navigation, cross-page flows, permission-gated UI, serverless-vs-stateful UI differences). | Only Scout UI tests exercise the full browser + server stack. |
| **Scout API test** | The suite mostly validates **data correctness**: server responses, exact data values, API behavior, or backend logic that an FTR test was reaching through the UI. | Data-correctness assertions don't need a browser. API tests are faster, less flaky, and cheaper to run in parallel. |
| **Unit / component test (RTL/Jest)** | The behavior can be exercised in isolation, without a running server. | Pulls coverage out of e2e and into the fastest, most reliable layer. |
| **Drop** | Duplicates existing coverage, tests deprecated features, or is an artifact of FTR limitations. | Record what coverage (if any) is lost. |
| **Defer** | Depends on a Scout capability that doesn't yet exist. | Flag the missing capability explicitly. |

## RTL/Jest candidates (strongest signal to downgrade)

Anything in this list is almost certainly **not** a UI test. Place RTL tests next to the component under test (e.g. `my_component.test.tsx` alongside `my_component.tsx`):

- Internal component logic: loading/error states, conditional rendering based on props or hooks.
- Table/list structure: column configuration, row rendering, sorting, data-driven assertions.
- Form fields and filters: input validation, field interactions, filter clearing.
- Hover states, tooltips, popovers, and toggle behaviors.
- Feature-flagged UI: tabs/sections that appear based on config, agent type, or license.
- Filter behavior that doesn't require a running server.

## Scout API candidates

Downgrade UI to API when the test:

- Asserts exact data values (e.g. document counts, field contents, response shapes).
- Validates API responses or contract behavior the UI was used to inspect.
- Checks backend logic through the UI (RBAC outcomes, server-side filtering, error responses).

## What stays as a Scout UI test

Keep Scout UI for what genuinely **requires** the full stack:

- Navigation and cross-page flows.
- Permission-gated UI behavior end-to-end.
- Serverless-vs-stateful rendering differences.
- User flows that span multiple pages or persist state across navigation.

## Recording in the plan

The planner step records each downgrade in the test inventory table (see [`output-template.md`](output-template.md), section 1) with a one-line justification, and surfaces a per-type breakdown in section 2 ("Test type routing"). The execution step then follows that classification rather than re-deciding per file.
