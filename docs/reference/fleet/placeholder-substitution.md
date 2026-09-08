# Placeholder substitution convention

**Applies to:** Fleet package workflow assets and Agent Builder agent assets
**Source of truth:** `x-pack/platform/plugins/shared/fleet/server/services/epm/packages/install_state_machine/steps/step_install_workflow_assets.ts`

## Problem

A Fleet package is a static archive. It cannot know the connector IDs or agent
IDs of the stack it will be installed on — those are created by the operator,
after the package is authored. A packaged asset therefore cannot hardcode them,
and cannot be left blank either, because an asset with an empty connector
reference is invalid and will not import.

## Naming

Placeholders use the `REPLACE_WITH_` prefix. There are two forms.

| Placeholder | Replaced with | Example |
| --- | --- | --- |
| `REPLACE_WITH_<VAR_NAME>` | Package policy var value | `REPLACE_WITH_GITHUB_CONNECTOR_ID` |
| `REPLACE_WITH_FLEET_AGENT_<NAME>` | Installed fleet agent ID | `REPLACE_WITH_FLEET_AGENT_CLASSIFIER` → `fleet-default-myint-classifier` |

The var token is derived mechanically from the package policy var name:

```
REPLACE_WITH_ + <var name>.toUpperCase()
```

| Package policy var | Placeholder |
| --- | --- |
| `github_connector_id` | `REPLACE_WITH_GITHUB_CONNECTOR_ID` |
| `slack_connector_id` | `REPLACE_WITH_SLACK_CONNECTOR_ID` |

The recognised token shape is `REPLACE_WITH_[A-Z0-9_]+`. Because the mapping is
derived from the var name, **no registry of placeholders exists and none is
needed** — declaring the var is what creates the placeholder.

> There is no separate `REPLACE_WITH_VAR_*` or `REPLACE_WITH_CONNECTOR_*` form.
> A connector ID is supplied as an ordinary package policy var, so it uses the
> plain uppercased-var-name token like any other value.

## Manifest-var mapping

```yaml
# manifest.yml
vars:
  - name: github_connector_id
    type: text
    title: GitHub connector
    required: true
```

```yaml
# workflow YAML, as shipped in the archive
steps:
  - name: fetch_issues
    type: github.runQueryTemplate
    connector-id: REPLACE_WITH_GITHUB_CONNECTOR_ID
    with:
      templateId: listIssues
```

After install, with the policy var set:

```yaml
    connector-id: 36977288-562c-41c8-ade3-53a0bc633a28
```

Substitution is a literal string replace over the YAML text, applied with
`replaceAll` — so one placeholder may be referenced by any number of steps.

## Multi-value vars

An array var is joined with commas; empty and whitespace-only entries are
dropped:

```yaml
vars:
  - name: repos
    type: text
    multi: true
```

`REPLACE_WITH_REPOS` → `repo-a,repo-b,repo-c`

A var whose value is empty, whitespace-only, or an array that reduces to nothing
is treated as **unset** and its placeholder is left unresolved.

## Runtime resolution is not supported

Liquid `{{ policy.vars.* }}` at run time is **not** a supported resolution path.
Substitution happens once, at install. Assets must be authored against the
install-time token.

## Unresolved placeholders

A placeholder with no matching package policy var is left in place and logged:

```
Workflow placeholder REPLACE_WITH_X has no matching package policy var
```

Affected workflows are imported **disabled** rather than silently broken, so an
incomplete configuration is visible instead of failing at run time.

## Reinstall and upgrade: carry-forward

The archive *always* contains placeholders, including on upgrade. A naive
reinstall would overwrite a working, operator-configured asset with placeholder
text and force-disable it, destroying live configuration on every package
upgrade.

Install therefore carries forward already-resolved values:

> For each placeholder still unresolved in the incoming YAML, reuse the value at
> the same key in the currently-installed asset.

The narrowness is the point:

- Only **placeholders** are filled. A key already holding a real value in the
  incoming YAML is never touched, so package updates still win.
- The value is matched **by key**, not by position, so reordering steps in a new
  package version does not shuffle connector assignments.
- A carried-forward value that is itself a placeholder is ignored, so an
  unconfigured install does not propagate junk forward.

## Where substitution runs

| Asset type | Install step |
| --- | --- |
| Workflows | `step_install_workflow_assets.ts` |
| Agent Builder agents | `step_install_agent_assets.ts` (calls the same `substituteWorkflowConnectorIds`) |

Sharing one implementation is deliberate: an agent and a workflow referencing the
same connector use the same token spelling.

## Failure modes

| Symptom | Cause | Fix |
| --- | --- | --- |
| Asset imported but disabled; log warns of an unresolved placeholder | No package policy var matches the token | Add the var, or correct the token spelling |
| Placeholder text still present after install | Case mismatch between var name and token | Uppercase the var name exactly |
| Asset reverts to placeholders after upgrade | Carry-forward could not find the key | Keep key names stable across package versions |
| Connector-not-found at run time | A real ID was shipped in the archive | Replace it with a placeholder |

## Related

- [Fleet package authoring guide](./package-authoring-guide.md)
- [Workflow ETL cookbook](../workflows/etl-cookbook.md)
- [Fleet agent authoring](../agent-builder/fleet-agent-authoring.md)
