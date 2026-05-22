# Test type downgrades

Not every FTR test should become a Scout UI test. Many should be downgraded to a Scout **API** test or a **unit/component test (RTL/Jest)**. This file is consumed by:

- [`generate-plan.md`](generate-plan.md) step 2 (triage), to decide each test's target type
- [`execute-plan.md`](execute-plan.md) steps 1 and 7, when implementing or noticing a misclassification

## How to decide

The authoritative decision matrix lives in the Scout best practices doc — do not duplicate it here:

[`docs/extend/scout/best-practices.md#pick-the-right-test-type`](../../../../docs/extend/scout/best-practices.md#pick-the-right-test-type)

That section covers when to choose a Scout UI test, Scout API test, Jest integration test, or Jest unit test, with concrete code examples for each.

### Default to API, not UI

UI is the most expensive Scout fixture. Only choose it when the test actually validates rendering, interaction, or cross-page navigation. For everything else, downgrade — even if FTR used the browser, that was usually because the browser was already open, not because rendering mattered.

Strongest downgrade signals (each maps to a known backing endpoint):

| FTR pattern | Backing API | Migration target |
|-------------|-------------|------------------|
| Role/feature-control visibility (navlinks, badges, enabled/disabled buttons per role); space-scoped permission gating; app-not-found redirects on disabled features | `POST /api/core/capabilities` (and `/s/<space>/...` for space-scoped) | API spec asserting the resolved capabilities object; create spaces via `apiServices.spaces.create(...)` |
| Data correctness — counts, exact values, aggregation results read from the rendered UI | The `/internal/<plugin>/...` route the page calls (check `server/routes` or the network panel) | API spec hitting the endpoint directly |
| Saved-object CRUD verification ("after delete the listing has N items"; "the new item exists") | `/api/saved_objects/*` or `POST /api/content_management/rpc/{search,delete}` | API spec, or hybrid: keep the UI flow but move count/state assertions to an API helper in `afterAll` |
| Server-side response shape that happens to flow through the UI | The relevant API directly | API spec |

For the auth strategy used in the downgraded test, see `execute-plan.md` step 4.

## Where RTL/Jest tests live

When the plan classifies an FTR test as a unit/component test, place the new test next to the component under test (not in `test/scout`):

- `<plugin>/public/components/my_component/my_component.tsx`
- `<plugin>/public/components/my_component/my_component.test.tsx`

Before writing one, find a similar `*.test.tsx` next to a sibling component in the same plugin and follow that file's setup (testing utilities, mocks, providers). Plugins differ in their Jest patterns; mirror local conventions rather than inventing a new one.

## Who runs the migration

All test-type targets — Scout UI, Scout API, **and RTL/Jest** — are migrated by step 3 (execute) of the parent skill, following [`execute-plan.md`](execute-plan.md). For RTL/Jest extractions, the executor follows the host plugin's existing Jest patterns (see above) rather than the Scout-specific patterns.

If a downgrade requires component refactoring (e.g. extracting a render-only component to make it unit-testable) that goes beyond a straightforward port, the executor surfaces it as a `guided` batch in the plan rather than attempting it autonomously.
