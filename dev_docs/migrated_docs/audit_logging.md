---
id: kibAuditLogging
slug: /kibana-dev-docs/key-concepts/audit-logging
title: Audit Logging
description: Audit Logging
date: 2025-08-21
tags: ['kibana', 'onboarding', 'dev', 'logging', 'audit']
---

Audit logging is a subscription feature that tracks security-related events for compliance, accountability and security monitoring.

## Automatic audit logging

Kibana automatically records audit events for:
- **HTTP endpoints** - All API calls
- **Saved Objects** - CRUD operations (scoped clients only)
- **Spaces** - CRUD operations  
- **Authentication** - Login/logout events

> [!WARNING]
> Saved Object operations are only audited when using the Scoped Saved Objects Client. Unscoped clients or excluding the `security` wrapper will skip audit logging.

View all audit events in the [audit logging documentation](https://www.elastic.co/guide/en/kibana/current/xpack-security-audit-logging.html#xpack-security-ecs-audit-logging).

## Custom audit logging

Implement custom audit logging through the `security` plugin for operations not covered automatically:

```typescript
const auditLogger = securitySetup.audit.asScoped(request);
auditLogger.log({
  message: 'User is updating dashboard [id=123]',
  event: {
    action: 'saved_object_update',
    category: ['database'],
    type: ['change'],
    outcome: 'unknown',
  },
  kibana: {
    saved_object: { type: 'dashboard', id: '123' },
  },
});
```

## What to audit

**Purpose**: Support compliance, accountability, and security - not debugging or usage statistics.

**Scope**: Resources owned by Kibana (e.g., saved objects). Elasticsearch handles auditing for user indices.

**Required events**:
- **System access** - Authentication attempts (success/failure)
- **Data reads** - Authorization attempts (success/failure)  
- **Data writes** - Authorization attempts (success/failure)

## When to log

**Timing tradeoffs**:
- **Before operation** - May log false positives if operation fails
- **After operation** - May miss logs if Kibana crashes
- **Both** - Creates noise and duplication

**Guidelines**:
- **Write operations** - Log after authorization passes, before response (captures intention)
- **Read operations** - Log after completion (captures what was actually accessed)
- **Message clarity** - Be explicit about timing: "User has logged in" vs "User is creating dashboard"

## Multiple events

**When to create separate events**:
- **Multiple operations** in single request - Log each separately
- **Bulk operations** - One event per resource
- **Background tasks** - Separate events for task creation and execution

**When to use single event**:
- **Internal checks** - Use `event.outcome` field instead of separate event
- **Errors** - Use `error` fields on main operation event

**Correlation**: Link related events using ECS `trace.id` property.

## Reference

See `docs/user/security/audit-logging.asciidoc` for complete list of Kibana audit events.