# Spec: APM Visual Regression

## ADDED Requirements

### Requirement: Replace Cypress visual regression with Playwright screenshot assertions

The system SHALL port visual regression testing from `@frsource/cypress-plugin-visual-regression-diff` to Playwright screenshot assertions. Cypress specs that use `cy.matchImage()` or `cy.getByTestSubj(...).matchImage()` SHALL be replaced by Playwright `expect(locator).toHaveScreenshot()` or equivalent.

#### Scenario: Service map visual regression is ported to Playwright

- **GIVEN** `service_map/service_map.cy.ts` uses `cy.getByTestSubj('serviceMap').matchImage({ imagesPath, title: 'service_map' | 'detailed_service_map', maxDiffThreshold: 0.02 })` with `cy.withHidden('[data-test-subj="headerGlobalNav"]', ...)` to hide header for consistent screenshots
- **WHEN** migration is complete
- **THEN** Scout spec uses Playwright `expect(page.getByTestId('serviceMap')).toHaveScreenshot('service_map.png')` (or similar) with equivalent viewport and element masking to exclude variable regions (e.g. global nav)

#### Scenario: Snapshot baseline and diff tolerance

- **GIVEN** Cypress uses `maxDiffThreshold: 0.02` for acceptable pixel diff
- **WHEN** Playwright screenshot comparison is implemented
- **THEN** Playwright config or assertion options allow configurable tolerance (e.g. `maxDiffPixels` or `threshold`) to match Cypress behavior where appropriate

#### Scenario: No other Cypress specs use visual regression

- **GIVEN** the 21 APM Cypress specs
- **WHEN** audit is complete
- **THEN** only `service_map/service_map.cy.ts` uses `matchImage`; no other specs require visual regression migration (Note: service_map.cy.ts is currently `describe.skip`)

---

### Requirement: Visual regression test isolation and stability

The system SHALL ensure visual regression tests are stable and reproducible: viewport size, element masking, and timing SHALL be controlled so screenshots do not flake.

#### Scenario: Viewport and masking are consistent

- **WHEN** a visual regression test runs
- **THEN** the viewport is fixed (e.g. 1920x1080 or project default) and dynamic elements (header, date picker, loading spinners) are masked or excluded from comparison

#### Scenario: Canvas/preparation steps are preserved

- **GIVEN** Cypress `prepareCanvasForScreenshot()` (sets html/body style, waits 300ms, clicks centerServiceMap, scrolls to top)
- **WHEN** Playwright equivalent is implemented
- **THEN** equivalent setup ensures the service map canvas is in a stable state before screenshot capture

---

### Requirement: Snapshot storage and CI

The system SHALL store screenshot baselines in a location discoverable by Scout (e.g. alongside spec or in a `__snapshots__` directory). CI SHALL support updating baselines (e.g. `--update-snapshots`) for intentional UI changes.

#### Scenario: Baselines are versioned

- **WHEN** screenshot baselines are created or updated
- **THEN** they are committed to the repo or stored in a way that CI can use them for comparison

#### Scenario: Update mode is available

- **WHEN** a developer needs to refresh baselines after an intentional UI change
- **THEN** a flag or command (e.g. `--update-snapshots`) allows updating baselines without failing the run
