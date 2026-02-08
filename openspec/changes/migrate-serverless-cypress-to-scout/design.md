# Technical Design

## Shared Helper: checkOsqueryResponseActionsPermissions

Create `common/response_actions.ts` with a function that encapsulates the tier test pattern:

```typescript
export const checkOsqueryResponseActionsPermissions = (
  enabled: boolean,
  testFn: typeof test,
  fixtures: { kbnClient, browserAuth, page, kbnUrl, pageObjects }
) => { ... }
```

The function:
1. Creates a rule via `loadRule(kbnClient)`
2. Logs in as `socManagerRole`
3. Navigates to `/app/security/rules/id/{ruleId}/edit`
4. Clicks the "Actions" tab (`testSubj('edit-rule-actions-tab')`)
5. Clicks the Osquery response action add button
6. If `enabled=true`: verifies Endpoint action button is clickable
7. If `enabled=false`: verifies upgrade message and disabled button

## Translation Patterns

### Cypress -> Playwright Mapping

| Cypress | Playwright |
|---------|-----------|
| `cy.getBySel('foo')` | `page.testSubj.locator('foo')` |
| `cy.contains('text')` | `page.getByText('text')` |
| `cy.get('selector')` | `page.locator('selector')` |
| `cy.visit('/path')` | `page.goto(kbnUrl.get('/path'))` or `page.gotoApp('path')` |
| `cy.login(role)` | `browserAuth.loginWithCustomRole(role)` |
| `cy.wait(ms)` | `page.waitForTimeout(ms)` |
| `.should('be.visible')` | `await expect(el).toBeVisible()` |
| `.should('be.disabled')` | `await expect(el).toBeDisabled()` |
| `.should('not.exist')` | `await expect(el).not.toBeVisible()` |
| `.click()` | `await el.click()` |
| `.type('text')` | `await el.fill('text')` or `await el.pressSequentially('text')` |
| `cy.intercept()` | `page.route()` |
| `loadRule()` (Cypress task) | `loadRule(kbnClient)` (API helper) |

### Page Objects

Use existing page objects from `fixtures/`:
- `pageObjects.liveQuery` — `inputQuery()`, `submitQuery()`, `checkResults()`, `selectAllAgents()`
- `pageObjects.packs` — `navigate()`, `clickAddPack()`, etc.
- `pageObjects.savedQueries` — `navigate()`, `clickEditSavedQuery()`, etc.

### Skip Strategy

All tests that are `describe.skip` or `it.skip` in Cypress stay skipped in Scout:
- `test.describe.skip` for entire file-level skips
- `test.skip` for individual test-level skips

## File-by-File Notes

- **timelines.spec.ts**: `@ess` only (no `@svlSecurity`), matches Cypress
- **ecs_mappings.spec.ts**: Keep `@ess, @svlSecurity` tags
- **packs_integration.spec.ts**: Has nested describes with different tags — preserve structure
- **saved_queries.spec.ts**: Has a nested `describe.skip` for prebuilt queries — use `test.describe.skip`
- **add_integration.spec.ts**: Has nested describes with different tags including `@brokenInServerless`
