# Fleet package authoring guide — Kibana-only ETL

This guide covers building a Fleet integration package that ships ETL workflows, agents,
ES|QL views, and knowledge base content — all installable via Fleet's package manager.

## Package structure

```
my-integration/
  manifest.yml              # Package manifest with vars, policy_templates
  kibana/
    workflow/               # Workflow YAML assets
      my_etl.yaml
    agent/                  # Agent Builder agent YAML assets
      my_agent.yaml
    esql_views/              # ES|QL view definitions
      my_view.esql
    knowledge_base/          # Markdown knowledge docs
      my_kb.md
  docs/
    README.md
```

## Manifest vars

Define vars in `manifest.yml` for users to configure at install time:

```yaml
vars:
  - name: github_token
    type: text
    secret: true
    required: true
```

Vars are substituted into workflow YAML via `REPLACE_WITH_*` placeholders (see DOC-003).

## Workflow assets

Workflow YAML files in `kibana/workflow/` are installed as managed workflows.
Set `default_enabled: true` to auto-enable on install.

## Agent assets

Agent YAML files in `kibana/agent/` are installed as managed Agent Builder agents.
Use `REPLACE_WITH_FLEET_AGENT_*` placeholders for agent-id references (see AB-006).

## ES|QL views

ES|QL view files in `kibana/esql_views/` are installed as saved ES|QL views.

## Knowledge base

Markdown files in `docs/` are indexed into the integration knowledge base on install
(see FLEET-010). Enterprise license required.

## Install order

Assets install in dependency order: knowledge base → ES|QL views → agents → workflows.
The install state machine handles ordering automatically.

## Uninstall

All managed assets are removed when the package is uninstalled. User-created assets
(dashboards, alerts) are preserved.
