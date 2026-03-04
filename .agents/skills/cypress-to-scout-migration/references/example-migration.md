# Example Migration: Timeline Creation

Real migration of `investigations/timelines/creation.cy.ts` to Scout. Demonstrates triage decisions, pattern mapping, page object design, API service design, and cleanup strategy.

## Triage summary

| Gate | Result |
|------|--------|
| Gate 0: Feature valid? | Yes — timeline creation UI unchanged |
| Gate 1: Already covered? | No Scout or API test covers these flows |
| Gate 2: Right layer? | UI — tests user workflows (create, save, RBAC, state lifecycle) |
| Gate 3: Adds value? | Yes — validates save states, RBAC, template creation |
| Gate 4: Flakiness risk? | Medium — `{ force: true }` on collapsed actions button (app bug), `LOADING_INDICATOR` waits |

## Before: Cypress (`creation.cy.ts`, abbreviated)

```typescript
import { ROWS } from '../../../screens/timelines';
import { deleteTimelines, createTimelineTemplate } from '../../../tasks/api_calls/timelines';
import { login } from '../../../tasks/login';
import { addNameToTimelineAndSave, executeTimelineKQL, closeTimeline } from '../../../tasks/timeline';

describe('Timelines', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteTimelines();                                  // API cleanup — no afterEach
  });

  it('should show the different timeline states', () => {
    login();
    visitWithTimeRange(TIMELINES_URL);
    openTimelineUsingToggle();

    cy.get(TIMELINE_STATUS).invoke('text').should('match', /^Unsaved/);

    addNameToTimelineAndSave('Test');
    cy.get(TIMELINE_STATUS).should('not.exist');

    cy.get(LOADING_INDICATOR).should('be.visible');     // Sync on background save
    cy.get(LOADING_INDICATOR).should('not.exist');

    executeTimelineKQL('agent.name : *');
    cy.get(TIMELINE_STATUS).invoke('text').should('match', /^Unsaved changes/);
  });

  it('should save timelines as new', () => {
    login();
    visitWithTimeRange(TIMELINES_URL);
    cy.get(ROWS).should('have.length', '0');            // EuiBasicTable quirk — see below

    openTimelineUsingToggle();
    addNameToTimelineAndSave('First');

    cy.get(LOADING_INDICATOR).should('be.visible');
    cy.get(LOADING_INDICATOR).should('not.exist');

    addNameToTimelineAndSaveAsNew('Second');
    closeTimeline();

    cy.get(ROWS).should('have.length', '2');
    cy.get(ROWS).first().invoke('text').should('match', /Second/);  // .first()/.last() — see below
    cy.get(ROWS).last().invoke('text').should('match', /First/);
  });
});
```

### Key problems in the Cypress source

| Pattern | Risk | Scout approach |
|---------|------|---------------|
| `LOADING_INDICATOR` wait | Critical — hard-coded UI sync point | Replaced with `waitForSaveComplete()` using `expect.poll()` or locator assertion |
| No `afterEach` cleanup | Critical — Scout shares environment | Added `beforeEach` + `afterAll` cleanup via `apiServices.timeline.deleteAll()` |
| `.first()` / `.last()` on rows | High — forbidden by `playwright/no-nth-methods` | Replaced with `toContainText(['Second', 'First'])` (ordered array) |
| `cy.get(ROWS).should('have.length', '0')` | Medium — EuiBasicTable always renders an empty-state row | Assert on empty-state message text instead |
| Selectors in separate `screens/` files | Structural | Moved to page object `readonly` properties |
| Actions in separate `tasks/` files | Structural | Moved to page object methods |

## After: Scout (`timeline_creation.spec.ts`, abbreviated)

```typescript
import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/ui';

spaceTest.describe(
  'Timelines',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ apiServices }) => {
      await apiServices.timeline.deleteAll();           // Defensive cleanup — handles prior failed runs
    });

    spaceTest.afterAll(async ({ apiServices }) => {
      await apiServices.timeline.deleteAll();           // Final cleanup
    });

    spaceTest('should show the different timeline states', async ({ browserAuth, pageObjects }) => {
      const { timelinePage } = pageObjects;

      await browserAuth.loginAsPlatformEngineer();      // Least-privileged role, not loginAsAdmin()
      await timelinePage.navigateToTimelines();
      await timelinePage.open();

      await spaceTest.step('Verify unsaved state', async () => {
        await expect(timelinePage.saveStatus).toHaveText(/^Unsaved/);
      });

      await spaceTest.step('Save and verify saved state', async () => {
        await timelinePage.saveWithName('Test');
        await expect(timelinePage.saveStatus).toBeHidden();
        await timelinePage.waitForSaveComplete();       // Replaces LOADING_INDICATOR wait
      });

      await spaceTest.step('Modify query and verify unsaved changes', async () => {
        await timelinePage.executeKQL('agent.name : *');
        await expect(timelinePage.saveStatus).toHaveText(/^Unsaved changes/);
      });
    });

    spaceTest('should save timelines as new', async ({ browserAuth, pageObjects }) => {
      const { timelinePage } = pageObjects;

      await browserAuth.loginAsPlatformEngineer();
      await timelinePage.navigateToTimelines();

      await spaceTest.step('Verify empty state', async () => {
        // EuiBasicTable always renders an empty-state <tr> — cannot assert row count as 0.
        // Assert on the empty-state message text instead.
        await expect(timelinePage.timelinesTable).toContainText(
          '0 timelines match the search criteria'
        );
      });

      await spaceTest.step('Create, save, and save as new', async () => {
        await timelinePage.open();
        await timelinePage.saveWithName('First');
        await timelinePage.waitForSaveComplete();
        await timelinePage.saveAsNew('Second');
      });

      await spaceTest.step('Verify both timelines in list', async () => {
        await timelinePage.close();
        const rows = timelinePage.getTimelineRows();
        await expect(rows).toHaveCount(2);
        // toContainText with array checks order — replaces .first()/.last()
        await expect(rows).toContainText(['Second', 'First']);
      });
    });
  }
);
```

### Key decisions annotated

| Decision | Why |
|----------|-----|
| `spaceTest` (not `test`) | Enables parallel execution — each worker gets its own Kibana space |
| `browserAuth.loginAsPlatformEngineer()` | Least-privileged role for CRUD. Not `loginAsAdmin()` (masks permission bugs) |
| `browserAuth.loginAsT1Analyst()` | Read-only RBAC test — verifies save button is disabled |
| `spaceTest.step()` for multi-step flows | Reuses browser context within a single test (each `spaceTest()` creates a new context) |
| `beforeEach` + `afterAll` cleanup | `beforeEach` handles prior failed runs; `afterAll` cleans up after the suite |
| `apiServices.timeline.createTimelineTemplate()` | API-based setup — not UI-based (faster, more reliable) |
| `toContainText(['Second', 'First'])` | Ordered array assertion — replaces `.first()` / `.last()` (forbidden by `playwright/no-nth-methods`) |

## Page object: `TimelinePage` (abbreviated)

```typescript
export class TimelinePage {
  // All locators as readonly constructor properties — centralized, auditable
  readonly panel: Locator;
  readonly saveStatus: Locator;
  readonly saveButton: Locator;
  readonly kqlTextarea: Locator;
  readonly saveButtonTooltipAnchor: Locator;

  constructor(private readonly page: ScoutPage) {
    this.panel = this.page.testSubj.locator('timeline-modal-header-panel');
    // saveStatus scoped to panel — avoids strict mode violation (appears in header AND bottom bar)
    this.saveStatus = this.panel.locator('[data-test-subj="timeline-save-status"]');
    this.kqlTextarea = this.page.testSubj
      .locator('timeline-search-or-filter-search-container')
      .locator('textarea');
    // CSS :has() for parent selection — EUI wraps disabled buttons in a tooltip anchor <span>
    this.saveButtonTooltipAnchor = this.page.locator(
      'span:has([data-test-subj="timeline-modal-save-timeline"])'
    );
  }

  async executeKQL(query: string) {
    await this.kqlTextarea.click();
    await this.kqlTextarea.clear();
    // pressSequentially — QueryStringInput submits React props on Enter, not DOM value.
    // fill() sets DOM value synchronously but React props update asynchronously.
    await this.kqlTextarea.pressSequentially(query);
    await this.kqlTextarea.press('Enter');
  }

  async hoverSaveButton() {
    // EUI wraps disabled buttons in a tooltip anchor that intercepts pointer events.
    await this.saveButtonTooltipAnchor.hover();
  }
}
```

### Patterns demonstrated

| Pattern | Where | Why |
|---------|-------|-----|
| Scoped locators | `saveStatus` scoped to `panel` | Avoids strict mode violation when same `data-test-subj` appears in multiple DOM locations |
| CSS `:has()` for parent selection | `saveButtonTooltipAnchor` | EUI wraps disabled buttons — hover the wrapper, not the button. Avoids XPath. |
| `pressSequentially` for query bars | `executeKQL()` | `QueryStringInput` React prop sync race — `fill()` + `Enter` submits stale value |
| Private helpers | `openSaveModalAndSetTitle()`, `confirmSaveModal()` | Shared logic between `saveWithName()`, `saveAsNew()`, `addNameAndDescription()` |

## API service: `TimelineApiService` (abbreviated)

```typescript
export const getTimelineApiService = ({
  kbnClient, log, scoutSpace,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  scoutSpace?: ScoutParallelWorkerFixtures['scoutSpace'];  // Space-aware for parallel tests
}): TimelineApiService => {
  const basePath = scoutSpace?.id ? `/s/${scoutSpace.id}` : '';

  return {
    createTimeline: async (input = {}) => { /* POST to /api/timeline */ },
    createTimelineTemplate: async (input = {}) => { /* POST with timelineType: 'template' */ },
    deleteAll: async () => {
      // Must fetch and delete both 'default' and 'template' types separately
      const [defaultIds, templateIds] = await Promise.all([
        fetchAllSavedObjectIds('default'),
        fetchAllSavedObjectIds('template'),
      ]);
      // ...
    },
  };
};
```

### Key design decisions

| Decision | Why |
|----------|-----|
| Space-aware `basePath` | Supports `spaceTest` parallel execution — requests go to the worker's isolated space |
| `deleteAll()` fetches both types | Timelines and templates use the same API but different `timeline_type` — must delete both |
| `measurePerformanceAsync` wrapper | Built-in Scout performance instrumentation |
| Default values with spread override | `{ ...DEFAULT_TIMELINE, ...input }` — callers only specify what they need |
