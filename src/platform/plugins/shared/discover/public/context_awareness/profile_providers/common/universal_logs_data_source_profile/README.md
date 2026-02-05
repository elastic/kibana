# Universal Base Logs Profile

## Purpose

This is the foundational profile for all log data in Discover, implementing the "One Discover" philosophy: if the data looks like a log, it should look and behave like a log—regardless of which solution the user is in.

## Key Characteristics

- **Universal Application**: Applies across all solution contexts (Default/Classic, Observability, Security, Search)
- **Data-Driven**: Activates solely based on data characteristics, not solution context
- **Contextual Rendering**: Provides essential log UX (badges, row indicators, infinite scroll) without imposing solution-specific workflows
- **Lower Precedence**: Solution-specific profiles (e.g., Observability logs profile) take precedence when present

## What This Profile Provides

### Extension Points Implemented

1. **getDefaultAppState** - Log-optimized defaults
   - Breakdown field: `log.level`
   - Default columns configuration

2. **getCellRenderers** - Log-specific cell formatting
   - Colored badges for `log.level` fields
   - Summary column for log preview

3. **getRowIndicatorProvider** - Visual row highlighting
   - Red indicator for ERROR logs
   - Yellow indicator for WARN logs

4. **getPaginationConfig** - Infinite scroll mode
   - Better UX for chronological log exploration

5. **getColumnsConfiguration** - Custom column headers
   - Source column labeled as "Content"
   - Log level fields with custom icons

6. **getRecommendedFields** - Surfaced log fields
   - `log.level`, `message`, `error.message`
   - `host.name`, `service.name`, `trace.id`
   - Container and orchestration fields

## Detection Logic

A data source is identified as "logs" if it matches **any** of:

1. **Explicit metadata**: `data_stream.type === 'logs'`
2. **Naming convention**: Pattern matches `logs-*`, `.ds-logs-*`, `filebeat-*`, `logs.*`, `logs`
3. **OpenTelemetry**: `event.dataset` ends with `.otel`
4. **Field heuristics**: Presence of log-specific fields (via `LogsContextService`)

## Capability-Based Feature Detection

**Universal Across All Deployments:**
- ✅ Works in: Security, Observability, Search, Classic/Default, **and ES3**
- ✅ Adapts automatically based on available capabilities

**How It Works:**
- Checks if Streams app exists → Shows "View in Streams" if available
- Checks if APM exists → Shows "View in APM" if available  
- Checks if SLO exists → Shows "Create SLO" if available
- Always shows "Logs overview" tab, but features adapt to environment

**Result:**
- Full-featured environments (O11y with all apps) → All features available
- Limited environments (ES3) → Gracefully degrades, core log UX still works
- Single codebase → No per-deployment variants needed

## Relationship with Observability Logs Profile

### Universal Base Logs Profile (this profile)
- **Scope**: All solutions
- **Purpose**: Provide base log UX everywhere
- **Features**: Core rendering, navigation, field recommendations
- **Excludes**: Solution-specific actions (no "View in APM", "Create SLO", etc.)

### Observability Logs Profile
- **Scope**: Observability solution only
- **Purpose**: Extend base profile with O11y-specific features
- **Features**: Links to Streams, APM, SLO creation, etc.
- **Precedence**: Higher (registered before universal profile)

When a user is in the Observability solution viewing logs, the Observability profile activates (not this one). When a Security analyst queries logs, this universal profile activates.

## Example Scenario

**User**: Security analyst investigating an incident  
**Action**: Switch query from alerts to `FROM logs-nginx.access-*`  
**Result**: 
- Universal Base Logs Profile activates
- Table transforms to show status badges, infinite scroll, error highlighting
- No Observability-specific links appear
- User gets log-optimized experience while staying in Security context

## Testing

Run profile tests:
```bash
yarn test:jest --testPathPattern=universal_logs_data_source_profile
```

## Future Enhancements

1. **Streaming support**: When streaming becomes available, consider enabling by default for logs
2. **ES3 enablement**: Extend to Elasticsearch Serverless in Phase 2
3. **Additional cell renderers**: HTTP status codes, duration fields
4. **Doc viewer customization**: Log-specific flyout tabs

## Related Documentation

- [Extension Points Inventory](../../EXTENSION_POINTS_INVENTORY.md)
- [Profile System Architecture](../../README.md)
- [One Discover Vision](../../../../../../../docs/discover/one_discover.md) _(if exists)_
