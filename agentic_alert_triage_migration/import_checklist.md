# Import Checklist (Tools + Skills)

This checklist assumes you are importing into Kibana Agent Builder and using
user-created skills via `POST /api/agent_builder/skills`.

## 1) Create ES|QL tools (user-created)

Create these tools from the JSON definitions in `elastic/infosec` under
`detection_and_analytics/agent_builder_config/agentic-alert-triage/tools`.

Tools and params:

- `alerts.aggregate.by-host-name` (param: `host_name`)
- `alerts.aggregate.username` (param: `user_name`)
- `alerts.get-alert-by-id` (param: `kibana_alert_ancestors_id`)
- `alerts.recent.by_host_id` (param: `host_id`)
- `alerts.recent.by_user` (param: `user_email`)
- `alerts.recent.open.prod` (no params)
- `asset.alert.lookup_join` (param: `user_email`)
- `asset.workstation.lookup-by-hostid` (param: `host_id`)
- `asset.workstation.lookup-by-username` (param: `user_email`)
- `endpoint.process_entity_id` (param: `process_entity_id`)
- `okta.login.source.ip` (param: `source_ip`)
- `okta.recent.login.list` (param: `user_email`)

## 2) Create user skills

Use the JSON files in `skill_definitions/` as payloads for
`POST /api/agent_builder/skills`.

Skill IDs (generated here):

- `agentic-alert-triage-l1-investigation`
- `agentic-alert-triage-l1-triage`
- `agentic-alert-triage-threshold-context`
- `agentic-alert-triage-l2-macos`
- `agentic-alert-triage-l2-windows`
- `agentic-alert-triage-l2-linux`
- `agentic-alert-triage-l2-aws`
- `agentic-alert-triage-l2-okta`
- `agentic-alert-triage-l2-azure`
- `agentic-alert-triage-l2-gcp`
- `agentic-alert-triage-l2-cloud-forensics`
- `agentic-alert-triage-l2-source-ip`
- `agentic-alert-triage-l3-review`
- `agentic-alert-triage-orchestrator`

## 3) Wire skills into the workflow (Phase 0)

Replace the agent IDs in `agentic-alert-triage.yaml` (or the `.flagged.yaml`) with the new skill IDs:

- `l1_agent_id` → `agentic-alert-triage-l1-investigation`
- `l2_threshold_agent_id` → `agentic-alert-triage-threshold-context`
- `l3_agent_id` → `agentic-alert-triage-l3-review`

Optional (full Phase 0): also replace L2 agent IDs with user skill IDs:

- `l2_macos_agent_id` → `agentic-alert-triage-l2-macos`
- `l2_windows_agent_id` → `agentic-alert-triage-l2-windows`
- `l2_linux_agent_id` → `agentic-alert-triage-l2-linux`
- `l2_aws_agent_id` → `agentic-alert-triage-l2-aws`
- `l2_okta_agent_id` → `agentic-alert-triage-l2-okta`
- `l2_azure_agent_id` → `agentic-alert-triage-l2-azure`
- `l2_gcp_agent_id` → `agentic-alert-triage-l2-gcp`
- `l2_cloud_forensics_agent_id` → `agentic-alert-triage-l2-cloud-forensics`
- `l2_source_ip_agent_id` → `agentic-alert-triage-l2-source-ip`

The workflow continues to handle:

- case creation / comments
- alert status updates

## 4) Phase 1: Orchestrator skill (optional)

Use the orchestrator skill for a single-pass triage report:

- Skill ID: `agentic-alert-triage-orchestrator`
- Output includes L1 investigation, L1 triage JSON, L2 findings, and L3 review sections.
- The workflow can attach this report as a single case comment.

## 5) Feature-flagged workflow

Use `agentic-alert-triage.flagged.yaml` for a single workflow that supports both modes:

- `consts.use_orchestrator: "true"` — runs the Phase 1 orchestrator skill path
- `consts.use_orchestrator: "false"` — runs the original L2/L3 multi-agent path

The flagged workflow keeps original L2/L3 agent IDs in the `else` branch.
To fully migrate the L2/L3 path to user skills, update those consts to the
corresponding `agentic-alert-triage-l2-*` and `agentic-alert-triage-l3-review` IDs.

## 6) E2E testing (EDOT only)

Run evals with EDOT (no Phoenix):

```
node scripts/evals init
node scripts/evals start --suite agent-builder
```

## 7) Gap validation

See `gap_rfc.md` for required mutation tools before full workflow removal.
