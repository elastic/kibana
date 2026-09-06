# Agent Builder fleet agent authoring guide

How to author `kibana/agent/*.yaml` files for package-managed agents.

## File structure

```yaml
# kibana/agent/my_agent.yaml
name: my-sdlc-agent
description: Analyzes SDLC metrics from GitHub data
instructions: |
  You are an SDLC analysis agent. Use the available tools to:
  1. Query GitHub for pull request data
  2. Identify bottleneck patterns
  3. Generate summary insights
tools:
  - elasticsearch.search
  - elasticsearch.esql.query
  - integration_knowledge
connector_placeholders:
  - REPLACE_WITH_CONNECTOR_github
knowledge:
  - my-integration-kb
```

## Tools

Package agents use platform tools only — no product builtin tools:

| Tool | Purpose |
|------|---------|
| `elasticsearch.search` | Query ES indices |
| `elasticsearch.esql.query` | Run ES|QL queries |
| `elasticsearch.esql.materialize` | Snapshot query results to index |
| `integration_knowledge` | Retrieve integration KB content |

## Connector placeholders

Use `REPLACE_WITH_CONNECTOR_*` for connector IDs that resolve at install time.

## Knowledge dependencies

Reference knowledge base docs from the package's `docs/` directory.
The KB is indexed on install (FLEET-010) and automatically available to the agent (AB-003).

## Agent-id references

Other workflows reference the agent via `REPLACE_WITH_FLEET_AGENT_<name>`:

```yaml
# workflow YAML
steps:
  - id: analyze
    ai.agent:
      agent_id: "${REPLACE_WITH_FLEET_AGENT_my_agent}"
```

## Install

Agent YAML files are installed by `step_install_agent_assets.ts` during package install.
Managed agents are read-only in the UI (AB-004) — users cannot edit them directly.
