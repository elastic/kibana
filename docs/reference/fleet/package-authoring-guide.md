# Fleet package authoring guide: Kibana-only ETL integrations

**Status:** implemented
**Audience:** integration package authors

Most Fleet integrations ship Elastic Agent inputs: the agent collects data and
ships it to Elasticsearch. A **Kibana-only** integration ships none. All of its
work runs inside Kibana — scheduled workflows call connectors, transform the
results, and write to Elasticsearch directly.

This guide covers authoring that kind of package.

## When to use this shape

Use a Kibana-only package when the data source is **an API you call**, not a
host you install an agent on:

- SaaS APIs (GitHub, Jira, Slack) reached with an operator-supplied credential
- Sources that need cross-record correlation before indexing
- Sources where a single scheduled caller must respect a shared org-wide rate limit

Use a normal agent-based integration when data originates on a machine you can
run an agent on — logs, metrics, endpoint telemetry.

### Not the same as hosted agentless

Elastic's **hosted agentless** deployment mode (`deployment_modes.agentless`)
still runs an Elastic Agent — Elastic operates it instead of you. A Kibana-only
integration runs **no agent at all**. The two are distinct and are detected
differently in code; do not assume the agentless helpers apply.

## Manifest shape

The signal is a policy template that declares an empty `inputs` array:

```yaml
name: sdlc_intel
title: SDLC Intelligence
version: 0.1.0
type: integration
format_version: 3.0.0

policy_templates:
  - name: sdlc_intel
    title: SDLC Intelligence
    description: Ingests SDLC activity into Elasticsearch.
    inputs: []                    # <- no Elastic Agent
    deployment_modes:
      default: agentless

vars:
  - name: github_connector_id
    type: text
    title: GitHub connector
    required: true
```

`inputs: []` is what Fleet keys on. It is deliberately strict: if **any** policy
template in the package declares inputs, the package is treated as agent-based
and the agent policy step is shown as usual. A partial match must not hide a
step the operator actually needs.

### What the operator sees

Because there is no agent, Fleet adapts the install flow:

- The **"Where to add this integration?"** agent policy step is hidden.
- A **connector setup checklist** is shown instead, listing every connector var
  the package declares, which are configured, and which are still outstanding.

A package var is recognised as a connector reference by naming convention: it
ends in `_connector_id` or `_connector`. Name connector vars accordingly and the
checklist populates automatically.

## Package assets

A Kibana-only package ships its behaviour as Kibana assets:

| Directory | Contents |
| --- | --- |
| `kibana/workflow/` | Scheduled ETL workflows |
| `kibana/agent/` | Agent Builder agents |
| `kibana/alerting_rule_template/` | Alerting rule templates |
| `kibana/dashboard/`, `kibana/index_pattern/` | Visualisation assets |
| `elasticsearch/` | Index templates, ES\|QL views |

Workflow and agent assets reference connectors through placeholders rather than
hardcoded IDs — see the
[placeholder substitution convention](./placeholder-substitution.md).

## Install lifecycle

1. Operator installs the package. Assets import; workflows referencing
   unconfigured connectors are imported **disabled**.
2. Operator creates the connectors and fills the package policy vars.
3. Fleet re-applies workflow and agent assets, substituting the real IDs.
4. Operator enables the workflows.

Step 3 is a targeted re-apply of the workflow and agent install steps only — not
a full package reinstall — so a connector rotation does not disturb unrelated
assets.

## Checklist

- [ ] Every policy template declares `inputs: []`
- [ ] `deployment_modes.default: agentless`
- [ ] Every connector var is `required` where the package cannot run without it
- [ ] Connector vars end in `_connector_id` or `_connector`
- [ ] Assets reference connectors only via `REPLACE_WITH_*` placeholders
- [ ] No real connector ID appears anywhere in the archive
- [ ] Workflows are safe to import disabled

## Related

- [Placeholder substitution convention](./placeholder-substitution.md)
- [Workflow ETL cookbook](../workflows/etl-cookbook.md)
- [Integration alerting templates enablement guide](./integration-alerting-templates.md)
- [Reference architecture: packaged multi-source ETL on Kibana](./packaged-etl-architecture.md)
