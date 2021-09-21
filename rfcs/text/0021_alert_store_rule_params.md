- Start Date: 2021-09-21
- TTL: 2021-10-01
- Champion: @afgomez
- Main reviewer:
- Owner team: @elastic/logs-metrics-ui
- Stakeholders: @elastic/observability-rac, @elastic/security-threat-hunting
- RFC PR: (leave this empty, it will be a link to PR of this RFC)
- PoC PR:
- Kibana Issue: https://github.com/elastic/kibana/issues/112688

# Executive Summary

The Alerts-as-Data initiative stores a document in an `.alert*` index every time an alert happens. This document contains metadata about the alert, like the rule type, the app that generated the alert, when it was triggered, its status, etc.

Alongside the existing data we want to store the params of the **rule** that triggered the alert.

## Problem statement

The plugin authors of the different alerting UIs need access to the rule params that triggered the alert to create different functionality, for example:

- Show a chart with the values that triggered the alert against the rule threshold.
- Link to a specific view within the app (e.g. for an alert triggered by high CPU usage, link to a CPU usage chart of dashboard)

## Goals

What are the goals of this project? How will we know if it was successful?

## Proposal

We want to store the rule params into the alert document, in the field `kibana.alert.rule.params`. This field will be added to the `.alert*` indices with the following mapping:

```json
{
  "type": "object",
  "enabled": false
}
```

The field should not be enabled for the following reasons:

- We are not interested in querying the alerts by the rules that triggered them.
- Each rule type has their own params. Disabling the field allows polymorphism in the field and prevents doing unnecessary mappings.

Rule type authors will store the rule params with the rule executor.

```tsx
alertPlugin.registerType({
  id: '...',
  executor: ({ services, params }) => {
    const { alertWithLifecycle } = services;

    alertWithLifecycle({
      id: '...'
      fields: { 'kibana.alert.rule.params': params }
    });
  }
});
```

# Alternatives

#### Querying the rule `savedObject`

The alert document saves the rule uuid. We could get the params of the alert by querying the rule saved object. However, if the user changes the rule settings after the alert was triggered, the settings.

#### Using specific ECS fields

Consider this example: we set up a rule that triggers when any host has a CPU usage above 50%. The alert gets triggered with a value of 75%. The resulting alert document could be:

```json
{
  "host.cpu.usage": 0.75,
  "kibana.alert.rule.params": {
    "criteria": [
      {
        "field": "host.cpu.usage",
        "comparator": "GT",
        "threshold": 0.5
      }
    ]
  }
}
```

In this scenario it makes more sense to keep ECS fields for the value that triggered the alert. On top of that, some of the rule params don't match with any available ECS field.

# How we teach this

- Update the documentation of the alerting plugin to
- Document the field in the alerting schema list.

# Unresolved questions

We haven't thought yet how to correctly type the contents of the field for using within Typescript.
