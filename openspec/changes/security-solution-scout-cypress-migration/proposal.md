## Why

Security Solution has the largest Cypress test suite in Kibana: 249 specs in the main `security_solution_cypress` suite plus 84 specs in `defend_workflows`. These tests are critical for detection response, investigations, entity analytics, AI assistant, and more. The Kibana project is standardizing on Scout/Playwright. The migration will be split per team/config (matching today's CI structure) to enable parallel development, separate code review per team, and incremental rollout.

## What Changes

- Create a shared Scout test scaffold for Security Solution (fixtures, page objects, API helpers, roles, `esArchiver` equivalents)
- Migrate all 13 team/domain splits as separate PRs, each reviewable independently
- First PR: Scaffold + Cloud Security Posture (2 specs — smallest team for minimal first PR)
- Subsequent PRs (one per team, ordered by size):
  1. Automatic Import (1 spec, serverless only)
  2. AI4DSOC (4 specs, serverless only)
  3. Asset Inventory (4 specs)
  4. AI Assistant (7 specs)
  5. Entity Analytics (15 specs)
  6. Explore (~25 specs)
  7. Rule Management (~46 specs including prebuilt rules)
  8. Investigations (~59 specs)
  9. Detection Engine (~93 specs including exceptions)
  10. Defend Workflows (~84 specs — separate plugin location)
- Replicate `@cypress/grep` tag-based filtering with Playwright tags
- Port ESS/Serverless/Serverless QA deployment variants to Scout tag system
- Replicate `esArchiver`, `esClient` custom tasks as Scout API helpers
- Replicate SAML auth, transparent API proxy patterns for Defend Workflows

## Capabilities

### New Capabilities
- `security-solution-scout-scaffold`: Shared Scout test scaffold for all Security Solution teams (common fixtures, page objects, API helpers, roles, ES helpers, `@cypress/grep` tag mapping)
- `security-solution-cloud-security-posture`: Cloud Security Posture tests (2 specs — asset inventory, findings)
- `security-solution-automatic-import`: Automatic Import tests (1 spec, serverless only)
- `security-solution-ai4dsoc`: AI4DSOC tests (4 specs, serverless only)
- `security-solution-asset-inventory`: Asset Inventory tests (4 specs)
- `security-solution-ai-assistant`: AI Assistant tests (7 specs)
- `security-solution-entity-analytics`: Entity Analytics tests (15 specs — risk score, entity store, asset criticality)
- `security-solution-explore`: Explore tests (~25 specs — hosts, network, users, cases, filters)
- `security-solution-rule-management`: Rule Management tests (~46 specs — rule CRUD, prebuilt rules management/installation/upgrade/customization)
- `security-solution-investigations`: Investigations tests (~59 specs — timelines, threat intelligence, SIEM migrations, dashboards, data views)
- `security-solution-detection-engine`: Detection Engine tests (~93 specs — detection alerts, enrichments, rule execution, exceptions)
- `security-solution-defend-workflows`: Defend Workflows tests (~84 specs — endpoint management, response actions, policy, RBAC, tamper protection)

### Modified Capabilities

## Impact

- `x-pack/solutions/security/test/scout_security_solution/` — new shared Scout test directory
- `x-pack/solutions/security/test/security_solution_cypress/` — to be deprecated per-team
- `x-pack/solutions/security/plugins/security_solution/public/management/cypress/` — Defend Workflows to be deprecated
- `.buildkite/pipelines/pull_request/security_solution/` — Cypress pipeline files to be replaced with Scout equivalents
- `.buildkite/scripts/steps/functional/security_solution_*.sh` — replace with Scout scripts
- `.buildkite/scripts/steps/functional/defend_workflows*.sh` — replace with Scout scripts
