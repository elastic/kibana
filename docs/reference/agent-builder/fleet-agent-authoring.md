# Agent Builder fleet agent authoring guide

**Status:** implemented
**Audience:** package authors shipping Agent Builder agents
**Source of truth:** `x-pack/platform/plugins/shared/fleet/server/services/epm/packages/install_state_machine/steps/step_install_agent_assets.ts`

A Fleet package can ship **Agent Builder agents** so an integration arrives with
analysis capability, not just data. This page covers the asset format and the
install contract.

## Asset location

Agents are Kibana assets:

```
kibana/agent/<name>.yaml
```

Each YAML file becomes exactly one agent.

## Asset format

```yaml
name: SDLC delivery analyst
description: >
  Answers questions about issue and PR flow across the org, using the
  SDLC intelligence indices.
labels:
  - sdlc
avatar_color: "#0B64DD"
avatar_symbol: SD
configuration:
  instructions: >
    You analyse software delivery activity. Prefer aggregate queries over
    per-record listing. State the time window of every answer.
  tools:
    - tool_ids:
        - platform.core.search
        - platform.core.list_indices
```

`name`, `description`, and at least one entry under `configuration.tools` are
**required**. A file missing any of them fails the install with a message naming
the offending asset — loudly, rather than importing a half-configured agent.

## Only platform tools may be bound

A packaged agent may bind only tools whose IDs begin with `platform.`.

Binding a user-created tool would make the package's behaviour depend on a
saved object the package does not own and cannot guarantee exists — on install
into another space or stack, the agent breaks. That is precisely the coupling
package-managed agents exist to avoid, so the install **fails** rather than
importing an agent that will not work.

If your agent needs a capability no platform tool provides, the answer is to add
the platform tool, not to bind a local one.

## Connector references

Agent YAML goes through the same placeholder substitution as workflow assets, so
a connector reference is spelled identically:

```yaml
    connector-id: REPLACE_WITH_GITHUB_CONNECTOR_ID
```

See the [placeholder substitution convention](../fleet/placeholder-substitution.md).
Sharing the mechanism is deliberate — an agent and a workflow referencing the
same connector use the same token.

## Identity and upgrades

The agent ID is derived deterministically from the package name, space, and file
name:

```
fleet-<space>-<pkg>-<file>
```

Two consequences for authors:

- **Renaming a YAML file creates a new agent.** The old one is not updated; it is
  orphaned. Keep file names stable across versions.
- **Upgrades overwrite.** Install uses create-or-update against the derived ID,
  so a new package version replaces the agent definition, including
  instructions.

Do not attempt to recover the owning package by slicing the ID — hyphenated
package names make positional slicing wrong. The owning package is recorded in a
label instead (below).

## Governance metadata

Every packaged agent is installed with:

| Field | Value | Effect |
| --- | --- | --- |
| `readonly` | `true` | UI shows a managed badge; instruction edits are warned or blocked |
| `labels` | `managed_by_package` | Marks the agent as package-managed |
| `labels` | `fleet-package:<pkgName>` | Identifies the owning package for upgrades |

Author-supplied `labels` are preserved and merged, deduplicated.

The read-only marking matters because upgrades overwrite: an operator who edits a
managed agent's instructions would silently lose that edit on the next package
upgrade. Marking it managed makes the ownership explicit up front.

## Graceful degradation

If Agent Builder is unavailable on the target stack, agent installation is
**skipped with a debug log** — it does not fail the package install. A package
shipping both data and agents therefore still installs usefully on a stack
without Agent Builder.

## Checklist

- [ ] One agent per file under `kibana/agent/`
- [ ] `name`, `description`, and `configuration.tools` present
- [ ] Only `platform.*` tool IDs bound
- [ ] Connector references use `REPLACE_WITH_*` placeholders
- [ ] File names stable across package versions
- [ ] Instructions state the agent's data scope

## Related

- [Fleet package authoring guide (Kibana-only ETL)](../fleet/package-authoring-guide.md)
- [Placeholder substitution convention](../fleet/placeholder-substitution.md)
- [GitHub action-connector vs content-connector decision guide](../connectors/github-connector-decision.md)
