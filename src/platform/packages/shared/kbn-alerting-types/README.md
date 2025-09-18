# @kbn/alerting-types

Shared TypeScript type definitions for Kibana's alerting framework. This package provides comprehensive type interfaces and utilities for alerts, rules, actions, and related alerting functionality across the Kibana platform.

## Overview

The `@kbn/alerting-types` package contains essential TypeScript types that define the structure and contracts for Kibana's alerting system. It serves as the foundational type library used by alerting plugins, rule registry, and embedded alerts components throughout the platform.

## Package Details

- **Package Type**: `shared-common`
- **Owner**: `@elastic/response-ops`  
- **Visibility**: Shared across platform
- **Dependencies**: `@kbn/rule-data-utils`, `@kbn/utility-types`

## Core Type Categories

### Action Types
- `ActionGroup<T>` - Defines action group structures with severity levels
- `ActionGroupSeverity` - Severity level definitions for action groups
- `ActionVariable` - Variable definitions for action templates
- `ActionContextVariables` - Context variables available in action execution
- `SummaryActionContextVariables` - Variables for summarized actions

### Alert Types  
- `Alert<T>` - Core alert document structure with extensible additional fields
- `KnownAlertFields` - Standardized alert fields based on technical rule data
- `UnknownAlertFields` - Extensible record for custom alert fields
- `MetaAlertFields` - Elasticsearch document metadata (_id, _index, _score)

### Rule Types
- `RuleTypeTypes` - Various rule type definitions and contracts
- `RRuleTypes` - Recurring rule schedule definitions  
- `RuleNotifyWhenType` - Notification timing configurations
- `RuleSettings` - Rule configuration and behavior settings

### Framework Types
- `AlertingFrameworkHealthTypes` - Health check and status definitions
- `CircuitBreakerMessageHeader` - Circuit breaker functionality types
- `BuiltinActionGroupsTypes` - Default action group definitions

### Search & Query Types
- `SearchStrategyTypes` - Search strategy definitions for alert queries
- `BrowserFieldsResponse` - Browser field mapping responses
- `AlertFieldsResponse` - Alert field query response structures

## Usage Examples

### Importing Types
```typescript
import type { 
  ActionGroup, 
  ActionVariable, 
  Alert,
  ActionContextVariables 
} from '@kbn/alerting-types';
```

### Defining Action Groups
```typescript
const myActionGroup: ActionGroup<'critical' | 'warning'> = {
  id: 'critical',
  name: 'Critical Alert',
  severity: { level: 1 }
};
```

### Working with Alerts
```typescript
interface CustomAlert extends Alert {
  'custom.field': string[];
  'custom.value': number[];
}

const processAlert = (alert: CustomAlert) => {
  // Access standard alert fields
  console.log(alert._id, alert._index);
  
  // Access custom fields
  console.log(alert['custom.field']);
};
```

### Action Context Variables
```typescript
const getActionContext = (): ActionContextVariables => ({
  alertId: 'alert-123',
  alertName: 'My Alert',
  alertInstanceId: 'instance-456', 
  alertActionGroup: 'default',
  alertActionGroupName: 'Default',
  spaceId: 'default',
  params: {},
  context: {},
  date: new Date().toISOString(),
  state: {},
  rule: {
    id: 'rule-789',
    name: 'My Rule',
    spaceId: 'default',
    type: 'metrics',
    params: {}
  },
  alert: {
    id: 'alert-123',
    uuid: 'uuid-456',
    actionGroup: 'default',
    actionGroupName: 'Default',
    flapping: false
  }
});
```

## Integration with Kibana

This package is extensively used throughout Kibana's alerting ecosystem:

- **Platform Plugins**: alerting, rule_registry, embeddable_alerts_table
- **X-Pack Features**: Security alerts, ML anomaly detection, Observability monitoring
- **UI Components**: Alert tables, rule configuration, action forms

The types ensure consistency and type safety across all alerting functionality in Kibana, from rule creation and execution to alert display and action handling.
