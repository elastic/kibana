# Troubleshooting & Performance

## Prerequisites

| Component | Minimum Version |
|---|---|
| Elastic Stack | 9.3.0 |
| AWS CloudTrail integration | 4.6.0 |
| GCP Audit Logs integration | 2.46.0 |

Feature flag: `securitySolution:enableGraphVisualization` (enabled by default from 9.3.0).

## Common issues

### Graph not displayed despite having actor/target fields

**Cause**: Feature flag disabled.
**Fix**: Stack Management -> Advanced Settings -> enable `securitySolution:enableGraphVisualization`.

### Graph preview exists but graph is empty

**Cause**: Event timestamp is outside the selected time range.
**Fix**: Expand the date range to include the event's `@timestamp`.

### Nodes display without enrichment data (no type, icon, name)

**Cause**: Cloud Asset Discovery not installed or entity not yet discovered.
**Debug**:
1. Find the entity ID from the event (actor: `*.entity.id`, target: `*.target.entity.id`)
2. In Discover, query `entities-generic-latest` index: `entity.id: "<id>"`
3. If not found: entity hasn't been discovered yet — check Cloud Asset Discovery config and wait for sync (15-30 min)

### Wrong entity selected as actor

**Cause**: Priority order misunderstanding. Review: user > host > service > generic.
**Fix**: Ensure only the intended entity field is populated, or accept the priority order.

## Verification checklist

- [ ] Stack version 9.3.0+
- [ ] Feature flag enabled
- [ ] Events have actor + `event.action` + target fields
- [ ] Graph tab/preview appears in flyouts
- [ ] Nodes and edges render correctly
- [ ] (Optional) Asset Inventory enabled for enrichment

## Performance

**Built-in limits**: 1,000 events/alerts fetched, 300 nodes max rendered.

**Optimization tips**:
- Start with narrow time ranges (24h, 7d), expand gradually
- Use selective filters (specific actor + action) before broad ones
- If hitting 300-node limit: narrow time range or add filters
- Entity enrichment has negligible performance impact

## Getting help

Contact Cloud Security team via `#cloud-sec` Slack with:
- Elastic Stack version
- Integration name and version
- Sample event JSON (redacted)
- Screenshots and steps tried
