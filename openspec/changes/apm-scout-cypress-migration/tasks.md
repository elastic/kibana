# APM Scout Cypress Migration – Tasks

## 1. Gap analysis

- [ ] 1.1 Produce gap analysis document comparing all 21 Cypress specs to existing Scout coverage
- [ ] 1.2 Classify each spec as covered / partial / gap with rationale
- [ ] 1.3 Document which Scout specs correspond to each Cypress spec (where overlap exists)

## 2. Map APM auth roles to Scout

- [ ] 2.1 Verify Scout has viewer, editor, superuser equivalents for all Cypress login commands
- [ ] 2.2 Add `apmManageOwnAndCreateAgentKeys` to APM_ROLES and browserAuth fixture
- [ ] 2.3 Align APM_ROLES with `create_apm_users/authentication.ts` (elasticsearch, kibana, applications)
- [ ] 2.4 Run at least one spec per role to validate auth mapping

## 3. Migrate remaining Cypress-only specs

- [ ] 3.1 Migrate `_404.cy.ts` to Scout
- [ ] 3.2 Migrate `deep_links.cy.ts` to Scout
- [ ] 3.3 Migrate `diagnostics/diagnostics.cy.ts` to Scout
- [ ] 3.4 Migrate `feature_flag/comparison.cy.ts` to Scout
- [ ] 3.5 Migrate `home.cy.ts` to Scout
- [ ] 3.6 Migrate `infrastructure/infrastructure_page.cy.ts` to Scout
- [ ] 3.7 Migrate or extend mobile specs (`mobile_transactions.cy.ts`, `mobile_transaction_details.cy.ts`) in Scout
- [ ] 3.8 Migrate `navigation.cy.ts` to Scout
- [ ] 3.9 Migrate `no_data_screen.cy.ts` to Scout
- [ ] 3.10 Migrate `onboarding/onboarding.cy.ts` to Scout
- [ ] 3.11 Migrate `trace_explorer/trace_explorer.cy.ts` to Scout
- [ ] 3.12 Migrate `tutorial/tutorial.cy.ts` to Scout
- [ ] 3.13 Extend Scout for `service_overview/aws_lambda`, `azure_functions`, `errors_table`, `mobile_overview_with_most_used_charts`, `time_comparison` (if gaps)
- [ ] 3.14 Verify coverage parity: run Cypress and Scout side-by-side; ensure no scenarios dropped

## 4. Add visual regression where needed

- [ ] 4.1 Port `service_map/service_map.cy.ts` visual regression to Playwright (if re-enabling)
- [ ] 4.2 Add element masking and viewport control for stable screenshots
- [ ] 4.3 Create/update screenshot baselines; document `--update-snapshots` usage for CI

## 5. Create/update CI pipeline

- [ ] 5.1 Create `.buildkite/scripts/steps/functional/apm_scout.sh` (or equivalent)
- [ ] 5.2 Update `pull_request/apm_cypress.yml` to run Scout step (or create `apm_scout.yml`)
- [ ] 5.3 Ensure pipeline triggers on APM Scout and plugin path changes
- [ ] 5.4 Validate Scout pipeline passes in CI
- [ ] 5.5 Remove or disable Cypress step

## 6. Remove old Cypress infrastructure

- [ ] 6.1 Remove `ftr_e2e/cypress/` Cypress specs (after migration verified)
- [ ] 6.2 Remove Cypress dependencies from APM (`cypress`, `@frsource/cypress-plugin-visual-regression-diff`, etc.)
- [ ] 6.3 Remove `apm_cypress.sh` and FTR Cypress config
- [ ] 6.4 Update docs (README, dev_docs) to reference Scout instead of Cypress
