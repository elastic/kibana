# Spec: APM Auth Roles

## ADDED Requirements

### Requirement: Map APM Cypress auth roles to Scout

The system SHALL map all APM Cypress login commands to Scout `browserAuth` or `loginWithCustomRole` equivalents. Cypress uses: `loginAsSuperUser`, `loginAsViewerUser`, `loginAsEditorUser`, `loginAsMonitorUser`, `loginAsApmManageOwnAndCreateAgentKeys`, `loginAsApmAllPrivilegesWithoutWriteSettingsUser`, `loginAsApmReadPrivilegesWithWriteSettingsUser`.

#### Scenario: Viewer and Editor map to Scout built-in roles

- **GIVEN** Cypress `loginAsViewerUser` (ApmUsername.viewerUser = 'viewer') and `loginAsEditorUser` (ApmUsername.editorUser = 'editor')
- **WHEN** Scout specs need viewer/editor roles
- **THEN** Scout uses `browserAuth.loginAsViewer()` and `browserAuth.loginAsPrivileged()` (or equivalent) per `@kbn/scout-oblt` and existing APM Scout fixtures

#### Scenario: Superuser maps to Scout

- **GIVEN** Cypress `loginAsSuperUser` (elastic/changeme)
- **WHEN** Scout specs need superuser (e.g. diagnostics full tabs)
- **THEN** Scout uses the appropriate superuser/admin fixture from kbn-scout config sets

#### Scenario: APM custom roles are available in Scout

- **GIVEN** existing Scout `APM_ROLES` in `fixtures/constants.ts` (apmAllPrivilegesWithoutWriteSettings, apmReadPrivilegesWithWriteSettings, apmMonitor) and `browserAuth.loginAsApmAllPrivilegesWithoutWriteSettings`, `loginAsApmReadPrivilegesWithWriteSettings`, `loginAsApmMonitor`
- **WHEN** migration requires these roles
- **THEN** they are already available; any additional roles (e.g. apmManageOwnAndCreateAgentKeys) SHALL be added to APM_ROLES and browserAuth extension

---

### Requirement: Add missing APM roles to Scout

The system SHALL add Scout equivalents for any APM Cypress roles not yet present in Scout fixtures. Cypress uses `loginAsApmManageOwnAndCreateAgentKeys` for onboarding agent keys flow.

#### Scenario: apmManageOwnAndCreateAgentKeys role is available in Scout

- **GIVEN** Cypress `loginAsApmManageOwnAndCreateAgentKeys` (ApmUsername.apmManageOwnAndCreateAgentKeys) — editor + custom roles for agent config and event privileges
- **WHEN** onboarding spec or agent-keys flow is migrated
- **THEN** Scout defines this role in APM_ROLES (or reuses/create_apm_users alignment) and exposes `browserAuth.loginAsApmManageOwnAndCreateAgentKeys()`

#### Scenario: apmMonitor (apmMonitorClusterAndIndices) is available

- **GIVEN** Cypress `loginAsMonitorUser` (ApmUsername.apmMonitorClusterAndIndices)
- **WHEN** specs need monitor-only cluster/indices access
- **THEN** Scout `loginAsApmMonitor()` (already present) covers this role

---

### Requirement: Role definitions align with create_apm_users

The system SHALL align Scout role definitions (APM_ROLES, KibanaRole) with `x-pack/solutions/observability/plugins/apm/server/test_helpers/create_apm_users/authentication.ts` so that behavior matches Cypress FTR-created users.

#### Scenario: KibanaRole format is compatible with Scout

- **GIVEN** ApmCustomRolename definitions (elasticsearch cluster/indices, kibana feature privileges)
- **WHEN** Scout uses dynamic role creation (kbn-scout-oblt) or pre-provisioned users
- **THEN** the privilege structure matches create_apm_users so that viewer/editor/custom-role behavior is identical

#### Scenario: Users created in FTR config are reusable

- **GIVEN** APM FTR config creates users via create_apm_users
- **WHEN** Scout server config uses the same or equivalent config set
- **THEN** Scout can authenticate as those users if the config set includes APM user setup
