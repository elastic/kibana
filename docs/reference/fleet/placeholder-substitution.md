# Placeholder substitution convention

## Naming

All placeholders use `REPLACE_WITH_*` prefix:

| Placeholder | Replaced with | Example |
|------------|-------------|---------|
| `REPLACE_WITH_VAR_<name>` | Manifest var value | `REPLACE_WITH_VAR_github_token` → user's token |
| `REPLACE_WITH_FLEET_AGENT_<name>` | Installed fleet agent ID | `REPLACE_WITH_FLEET_AGENT_classifier` → `fleet-default-myint-classifier` |
| `REPLACE_WITH_CONNECTOR_<name>` | Connector config ID | `REPLACE_WITH_CONNECTOR_github` → connector instance ID |

## Manifest-var mapping

Vars defined in `manifest.yml` are substituted into workflow and agent YAML at install time:

```yaml
# manifest.yml
vars:
  - name: github_token
    type: text
    secret: true
```

```yaml
# workflow YAML
steps:
  - id: fetch
    connector.github.runQuery:
      token: "${REPLACE_WITH_VAR_github_token}"
```

## Agent-id convention

Agent placeholders resolve to the installed agent's saved object ID:

```yaml
steps:
  - id: classify
    ai.agent:
      agent_id: "${REPLACE_WITH_FLEET_AGENT_classifier}"
```

## Multi-value vars

When a var is an array, substitution produces a comma-separated list:

```yaml
vars:
  - name: repos
    type: text
    multi: true
```

`REPLACE_WITH_VAR_repos` → `repo-a,repo-b,repo-c`

## Validation

The package validator checks for unresolved placeholders after substitution.
Any `REPLACE_WITH_*` remaining in installed YAML is a validation error.
