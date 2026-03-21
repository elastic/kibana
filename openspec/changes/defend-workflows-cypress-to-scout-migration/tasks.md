## 1. Scaffold Scout test layout

- [x] 1.1 Run Scout generator for Security Solution with scout root `scout_defend_workflows` and type `ui` (or `both` if API needed)
- [x] 1.2 Add or adjust `tsconfig.json` under `scout_defend_workflows/ui/` so TypeScript and IDE resolve fixtures and tests
- [ ] 1.3 Run `node scripts/scout.js update-test-config-manifests` so the new config is discoverable (run after `yarn kbn bootstrap`)

## 2. Fixtures and shared utilities

- [x] 2.1 Add Defend Workflows–specific constants (e.g. routes, selectors) to fixtures
- [ ] 2.2 Add shared page objects or helpers for Defend Workflows navigation (endpoint list, policy, response actions) as needed for first specs

## 3. First migrated spec and coverage

- [x] 3.1 Migrate one small Cypress spec (e.g. response_actions or policy) to Scout following SCOUT_MIGRATION_GUIDE
- [x] 3.2 Run Scout Defend Workflows suite locally and fix any config or env gaps until at least one spec is green

## 4. CI integration

- [x] 4.1 Add Buildkite step script(s) for Scout Defend Workflows (stateful and optionally serverless)
- [x] 4.2 Wire Scout Defend Workflows step(s) into `defend_workflows.yml` (and serverless pipeline if applicable)
- [x] 4.3 Ensure pipeline triggers on changes to `scout_defend_workflows/` or relevant Security Solution paths
