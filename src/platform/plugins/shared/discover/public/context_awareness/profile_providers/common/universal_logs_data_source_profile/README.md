# Universal Base Logs Profile

## Purpose

Provides a consistent log-optimized Discover experience across all solution contexts based solely on data characteristics.

## Key Characteristics

- **Universal**: Works in Default/Classic, Observability, Security, Search, and all Serverless project types
- **Data-Driven**: Activates when data is detected as logs (regardless of solution context)
- **Capability-Aware**: Features adapt based on available apps (Streams, APM, etc.)
- **Lower Precedence**: Solution-specific profiles take priority when present

## Extension Points

### Extension Points Implemented

1. **getDefaultAppState** - Log-optimized defaults
   - Breakdown field: `log.level`
   - Default columns configuration

2. **getCellRenderers** - Log-specific cell formatting
   - Colored badges for `log.level` fields
   - Summary column for log preview
   - **Capability-aware**: Service name cells with APM links (if APM app available)

3. **getRowIndicatorProvider** - Visual row highlighting
   - Red indicator for ERROR logs
   - Yellow indicator for WARN logs

4. **getRowAdditionalLeadingControls** - Enhanced row actions
   - **Capability-aware**: Degraded docs and stacktrace controls (if Streams/APM available)
   - Gracefully degrades in ES3 or environments without these apps

5. **getPaginationConfig** - Infinite scroll mode
   - Better UX for chronological log exploration

6. **getColumnsConfiguration** - Custom column headers
   - Source column labeled as "Content"
   - Log level fields with custom icons

7. **getRecommendedFields** - Surfaced log fields
   - `log.level`, `message`, `error.message`
   - `host.name`, `service.name`, `trace.id`
   - Container and orchestration fields

8. **getDocViewer** - Log-optimized document viewer
   - **Capability-aware**: Streams and APM integrations (if apps available)
   - Gracefully degrades in ES3 or environments without these apps

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

All features check for app availability before enabling:

| Feature | Requires | Behavior |
|---------|----------|----------|
| Service name cells (APM links) | `apm` app | Shows clickable links if APM available, plain text otherwise |
| Degraded docs control | `streams` or `apm` app | Shows row control if apps available, hidden otherwise |
| Stacktrace control | `streams` or `apm` app | Shows row control if apps available, hidden otherwise |
| Doc viewer integrations | `streams` or `apm` app | Shows "Logs overview" tab with features if apps available |

**Result:**
- **Classic/ECH with APM/Streams**: Full experience with service links, row controls, and integrations
- **ES3 (Serverless Search)**: Core log UX (level badges, infinite scroll, summary) without APM/Streams features
- **Default/Security solutions**: Same as Classic - features adapt based on what's installed
- **Single codebase**: No per-deployment variants needed

## Relationship with Observability Logs Profile

### Universal Base Logs Profile (this profile)
- **Scope**: All solutions (Default, Security, Search, Observability*)
- **Purpose**: Provide base log UX everywhere with intelligent feature detection
- **Features**: 
  - Core rendering (level badges, summary, infinite scroll)
  - Capability-aware APM integration (service name links)
  - Capability-aware row controls (degraded docs, stacktrace)
  - Capability-aware doc viewer
- **Activation**: Pure data-based detection, no solution restriction

### Observability Logs Profile
- **Scope**: Observability solution only
- **Purpose**: Add O11y-specific state management and behaviors
- **Key Difference**: Uses `logOverviewContext$` BehaviorSubject for stateful interactions
- **Precedence**: Higher (registered before universal profile)

**In Classic/ECH with APM+Streams installed**, the universal profile provides nearly identical features to the O11y profile, with the main difference being:
- **O11y profile**: Uses stateful `logOverviewContext$` to communicate between row controls and doc viewer
- **Universal profile**: Uses simpler stateless approach

When a user is in the Observability solution viewing logs, the Observability profile activates (providing enhanced state management). When a Security analyst queries logs, this universal profile activates (providing similar features via capability detection).

## Example Scenarios

### Scenario 1: Security Analyst in Classic (with APM installed)
**User**: Security analyst investigating an incident  
**Action**: Switch query from alerts to `FROM logs-nginx.access-*`  
**Result**: 
- Universal Base Logs Profile activates
- Table shows: log level badges, service name links to APM, infinite scroll
- Row controls: degraded docs and stacktrace buttons appear
- Doc viewer: logs overview tab with APM integration
- User gets **full log-optimized experience** with APM/Streams features

### Scenario 2: Search User in ES3 (Serverless Search)
**User**: Developer building search application  
**Action**: Query `FROM logs-application-*` to debug  
**Result**: 
- Universal Base Logs Profile activates
- Table shows: log level badges, plain service names (no APM), infinite scroll
- Row controls: degraded docs and stacktrace buttons **hidden** (no APM/Streams)
- Doc viewer: standard Discover tabs only
- User gets **core log-optimized UX** that gracefully degrades

## Testing

Run profile tests:
```bash
yarn test:jest --testPathPattern=universal_logs_data_source_profile
```

## Future Enhancements

1. **Streaming support**: When streaming becomes available, consider enabling by default for logs
2. **Additional cell renderers**: HTTP status codes, duration fields
3. **Enhanced capability detection**: More granular feature flags for fine-tuned degradation

## Related Documentation

- [Extension Points Inventory](../../EXTENSION_POINTS_INVENTORY.md)
- [Profile System Architecture](../../README.md)
- [One Discover Vision](../../../../../../../docs/discover/one_discover.md) _(if exists)_
