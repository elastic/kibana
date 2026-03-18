# Gap RFC: Mutation Tools Needed for Full Skill Migration

## Summary

The Agentic Alert Triage workflow performs alert and case mutations through
Kibana HTTP requests. User-created skills cannot call arbitrary Kibana APIs,
so a full skill-only migration requires built-in mutation tools.

## Current blockers

1) **Cases mutation tools are missing**
   - Needed:
     - `platform.core.cases.create`
     - `platform.core.cases.add_comment`
     - `platform.core.cases.update`
   - A design spec already exists at:
     - `openspec/changes/cases-agent-builder-integration/specs/cases-mutation-tools/spec.md`

2) **Detection Engine alert status updates**
   - Workflow currently calls:
     - `POST /api/detection_engine/signals/status` to set `status: closed`
   - A built-in tool is needed, e.g.:
     - `security.alerts.update_status` or `security.detections.update_alert_status`

## Proposed tool behavior (high level)

- Mutation tools must use the underlying Kibana services (`CasesClient`, detection engine)
  and respect RBAC. No direct HTTP from user-created skills.
- Tools should be confirmable (user consent) for write actions.

## Acceptance criteria

- Agentic triage can:
  - create cases
  - add comments and attach alerts
  - update case metadata
  - close alerts
  without any workflow layer.

## Risks

- Without mutation tools, a full skill-only migration is blocked.
- Using MCP to call Kibana APIs directly is possible but bypasses platform RBAC
  patterns and is not recommended for end-user skills.
