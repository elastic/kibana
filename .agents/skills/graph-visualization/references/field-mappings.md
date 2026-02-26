# Field Mappings & Entity Resolution

## Required fields

Events must have all three to render in the graph:

| Field | Mapping | Description |
|---|---|---|
| Actor: `user.entity.id`, `host.entity.id`, `service.entity.id`, or `entity.id` | `keyword` | Unique identifier for the entity performing the action |
| `event.action` | `keyword` | The operation performed (e.g. "ConsoleLogin", "AssumeRole") |
| Target: `user.target.entity.id`, `host.target.entity.id`, `service.target.entity.id`, or `entity.target.id` | `keyword` | Unique identifier for the affected entity/entities |

Integration index (`logs-*`) must contain these mappings.

## Actor resolution priority

Only one actor per event. First match wins:

| Priority | Field | Description |
|---|---|---|
| 1 | `user.entity.id` | Highest — security-first (users are most critical context) |
| 2 | `host.entity.id` | If no user entity |
| 3 | `service.entity.id` | If no user/host entity |
| 4 | `entity.id` | Generic fallback |

The actor field may have multiple values (array), all of which become actor nodes.

## Target population

Unlike actors, **all** target fields are included simultaneously — no priority ordering:

- `user.target.entity.id`
- `host.target.entity.id`
- `service.target.entity.id`
- `entity.target.id`

Each target becomes a separate node. Multiple targets from the same event all get edges from the actor.

## Entity enrichment (optional)

Enrichment comes from the entity store generic index: `.entities-v1.latest.security_generic_<space-id>`

When a matching `entity.id` exists there, nodes display additional metadata:
- Entity names and descriptions
- Entity types and sub-types
- IP addresses and country codes

For cloud integrations, enrichment requires Cloud Asset Discovery to be installed. The graph works without it but shows basic information only.

## ECS alignment

Fields align with the [ECS Entity Field Set](https://www.elastic.co/docs/reference/ecs/ecs-entity):
- Entity fields nest under existing ECS field sets (e.g. `user.entity.*`, `host.entity.*`)
- Target entities use the `.target.*` namespace (e.g. `user.target.entity.id`)

### Related resources

- [ECS Entity Field Set RFC](https://github.com/elastic/ecs/blob/main/rfcs/text/0049-entity-fields.md)
- [ECS Entity Field Set docs](https://www.elastic.co/docs/reference/ecs/ecs-entity)
- [Generic entity discussion](https://github.com/elastic/ecs/issues/2559)
- [Epic: Logic for visualizing audit logs in graph viz](https://github.com/elastic/security-team/issues/10658)
