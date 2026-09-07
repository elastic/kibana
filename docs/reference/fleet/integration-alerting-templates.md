# Integration alerting templates enablement

Integration packages can ship alerting rule templates that define proactive
detection rules for common operational issues. This guide explains how these
templates behave during package installation and how administrators can
enable them.

## Current behavior (pre-FLEET-002)

Alerting rule templates are imported as saved objects during package
installation. However, they are **not** automatically materialized as live
alerting rules. An administrator must:

1. Navigate to **Stack Management → Alerts → Rules**.
2. Find the imported template.
3. Create a new rule from the template.
4. Configure the rule schedule, threshold, and actions.
5. Enable the rule.

This means templates are inert until an admin manually creates rules from
them. No alerts fire until this manual step is completed.

## Post-FLEET-002 behavior

When a package manifest includes `create_alerting_rules: true`, shipped
`alerting_rule_template/*.json` assets are automatically materialized as
real alerting rules on install. These rules are:

- **Created disabled** — no alerts fire until an admin explicitly enables them.
- **Action-less** — no connectors or notifications are wired. The admin must
  attach a connector action (Slack, email, webhook) before enabling.
- **Uninstallable** — removing the package removes the materialized rules.
- **Upgrade-safe** — re-install or upgrade reconciles rules without creating
  duplicates.

### Enablement steps

1. Install or upgrade the integration package in **Fleet → Integrations**.
2. Navigate to the integration's **Alerting** tab.
3. Review the created (disabled) rules.
4. For each rule:
   a. Click **Edit**.
   b. Attach a connector action (e.g., Slack notification).
   c. Per NFR-001/002, default the action target to a **team channel or team
      lead** — never an individual.
   d. Click **Enable**.

### Manifest opt-in

Package authors add the flag to `manifest.yml`:

```yaml
create_alerting_rules: true
```

When absent or `false`, the current behavior (templates as saved objects only)
is preserved. This ensures backward compatibility for existing packages.

## SDLC integration example

The SDLC Visibility Platform ships four alerting templates:

| Template | Trigger | Purpose |
|---|---|---|
| `sdlc-stale-epic-thin-tickets` | ES\|QL query | Flags epics with fewer than 3 P4 tickets |
| `sdlc-missing-prd` | ES\|QL query | Flags epics without a linked PRD |
| `sdlc-bottleneck-reviewer` | ES\|QL query | Flags PRs stuck in review beyond SLA |
| `sdlc-quarterly-trend` | ES\|QL query | Snapshots epic phase distribution quarterly |

With `create_alerting_rules: true` in the SDLC package manifest, these become
disabled rules on install. An admin attaches a Slack connector targeting the
`#sec-ai-dev-accelerators` channel and enables each rule.

## See also

- [Alerting settings](../configuration-reference/alerting-settings.md)
- [Fleet settings](../configuration-reference/fleet-settings.md)
- [Connectors and actions](../connectors-kibana/alerting-cases-connectors.md)
