---
id: kibDevDocsSecurityKibanaSystemUser
slug: /kibana-dev-docs/key-concepts/security-kibana-system-user
title: Security Kibana System User
description: This guide provides an overview of `kibana_system` user
date: 2025-08-21
tags: ['kibana', 'dev', 'contributor', 'security']
---

The `kibana_system` user is Kibana's internal service account for accessing Elasticsearch. Changes to its privileges must be carefully considered to maintain security.

## Overview

Kibana uses the `elastic/kibana` [service account](https://www.elastic.co/guide/en/elasticsearch/reference/current/service-accounts.html#service-accounts-explanation) with privileges equivalent to the `kibana_system` reserved role. This account should **never** have access to user data.

> [!WARNING]
> Most features don't require changes to `kibana_system` privileges. Always consult the security team before modifying these privileges.

## Access principles

### 1. Index access restrictions

**Allowed access:**
- **System indices owned by Kibana** (`all` permissions): `.kibana*`, `.fleet*`
- **System indices not owned by Kibana** (`read` only): `.security`

**Forbidden access:**
- **User data indices** (no dot prefix): `my-data`, `kibana-metrics`
- **System indices owned by other components** (modify operations)

**Index type examples:**
| Index Type | Permissions | Examples |
|------------|-------------|----------|
| User-defined data | ❌ none | `my-data`, `kibana-metrics` |
| External system indices | 👁️ read only | `.security` |
| Kibana system indices | ✅ all | `.kibana*`, `.fleet*` |

### 2. Security construct restrictions

**Forbidden operations:**
- Managing users
- Managing roles  
- Managing role mappings

**Rationale:** Prevents privilege escalation and reduces impact of credential compromise.

## Security rationale

### Account compromise protection

**Potential compromise vectors:**
1. **Insecure storage** - Plaintext in `kibana.yml`, documentation
2. **Host compromise** - Server access leading to credential theft
3. **Runtime compromise** - RCE exploits exposing credentials

**Impact reduction:** Minimal privileges = minimal damage from compromise.

### Developer error prevention

**Common mistake:** Using `kibana_system` credentials instead of user credentials in API calls.

**Result:** Authorization bypass ([Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/))

**Prevention:** Clear separation between system and user operations.

## Exceptions

### Telemetry collection
Limited exceptions exist for telemetry. This is a temporary compromise - long-term solutions are being explored.

### Fleet package management
Fleet manages certain package lifecycles during stack upgrades, requiring elevated privileges to specific data indices. [Fleet documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-templates.html) covers potential naming conflicts.

## Best practices

**For developers:**
- Use `kibana_system` only for Kibana-owned system operations
- Always use user credentials for user data access
- Document any new privilege requirements thoroughly
- Test with minimal privileges first

**For security reviews:**
- Question every new privilege request
- Verify minimal access principle
- Check for alternative approaches
- Consider long-term security implications

## Resources

- **Decision tree:** [Kibana system privilege decisions](https://whimsical.com/kibana-system-privilege-decision-tree-VTTGaTtjs9SnpbRNSg2Ptp)
- **Source code:** [KibanaOwnedReservedRoleDescriptors.java](https://github.com/elastic/elasticsearch/blob/main/x-pack/plugin/core/src/main/java/org/elasticsearch/xpack/core/security/authz/store/KibanaOwnedReservedRoleDescriptors.java)
- **Contact:** `@elastic/kibana-security` for privilege change reviews