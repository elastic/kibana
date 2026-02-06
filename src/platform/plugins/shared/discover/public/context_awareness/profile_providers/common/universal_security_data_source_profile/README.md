# Universal Security Base Profile

## Purpose

Provides a consistent security-optimized Discover experience across all solution contexts (except Security solution) based solely on data characteristics.

**This is a DRAFT implementation** - following the Universal Logs pattern.

## Key Characteristics

- **Universal**: Works in Default/Classic, Observability, Search, and all Serverless project types
- **Fallback Pattern**: Only activates when NOT in Security solution (Security solution profiles have higher priority)
- **Data-Driven**: Activates when data is detected as security-related (regardless of solution context)
- **Two-Profile Architecture**: Data source + document profiles (matches Universal Logs)

## Detection Logic

### Security Data Detection

A data source is identified as "security" if index pattern matches:

- `.alerts-security.alerts-*` - Security alerts
- `logs-endpoint.*` - Endpoint Security
- `logs-windows.*` - Windows events
- `logs-system.security*` - System security logs
- `logs-system.auth*` - Authentication logs
- `logs-aws.cloudtrail*` - AWS CloudTrail
- `logs-azure.*` - Azure logs
- `logs-network_traffic.*` - Network traffic
- `logs-zeek.*`, `logs-suricata.*` - Network security
- `auditbeat-*`, `winlogbeat-*` - Legacy beats

**Note**: Detection patterns to be validated with Security team.

## Features (Draft)

### Data Source Profile

1. **Security-Optimized Columns**
   - `@timestamp`, `event.action`, `event.category`, `host.name`, `user.name`, `source.ip`, `destination.ip`, `message`

2. **Alert/Event Row Indicators**
   - Yellow indicator + "alert" label for `event.kind === 'signal'`
   - Default indicator + "event" label for other events

### Document Profile

1. **Alert/Event Overview Tab**
   - Shows "Alert Overview" for alerts (`event.kind === 'signal'`)
   - Shows "Event Overview" for regular events
   - Placeholder implementation (to be completed)

## Activation Examples

| Query | Solution | Active Profiles |
|-------|----------|----------------|
| `FROM logs-endpoint.events-*` | Classic | Universal Security ✅ |
| `FROM logs-endpoint.events-*` | Observability | Universal Security ✅ |
| `FROM logs-endpoint.events-*` | **Security** | Security solution profiles (not Universal) |
| `FROM .alerts-security.alerts-*` | Classic | Universal Security ✅ |

## Testing

```bash
# Data source profile tests (to be added)
yarn test:jest src/platform/plugins/shared/discover/public/context_awareness/profile_providers/common/universal_security_data_source_profile/profile.test.ts
```

## Status

🚧 **DRAFT** - This is a preliminary implementation for review:
- Detection patterns need validation with Security team
- Features are basic stubs
- Doc viewer needs full implementation
- Tests need to be added

## Related

- **Universal Logs Profile**: `../universal_logs_data_source_profile/` (sister profile)
- **Security Solution Profiles**: `../../security/` (higher priority profiles)
