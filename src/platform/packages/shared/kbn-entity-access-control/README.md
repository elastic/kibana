# Entity access control

Shared ACL types, input validation, and permission checks. Stored ACLs have this shape:

```json
{
  "access_mode": "private",
  "entries": [
    { "type": "user", "id": "u_profile_id", "role": "member", "added_at": "2026-09-10T00:00:00.000Z" }
  ]
}
```

The entity stores its owner's profile ID separately. Entry IDs are user profile IDs,
not usernames. Each consumer defines the allowed roles and their operations.
The package does not access storage, resolve users, or grant feature privileges.

`buildEntityReadAccessQuery` requires `entries` to use an Elasticsearch `nested`
mapping so principal fields are matched within the same entry.

Consumers must check space and feature privileges before checking the ACL. They
must apply the same policy to searches, counts, reads, writes, and execution.
Missing ACLs require an explicit consumer policy.

`prepareAccessControl` validates the input, rejects duplicate users, removes owner
entries, and preserves membership dates. Public entities can retain entries for
additional permissions, such as editing. A consumer that forbids public entries
can add that restriction without changing the stored shape.

## Administrator access

`isEntityAccessControlAdmin(core, request)` uses Core Security to check for the
exact `superuser` role. Routes must use full authentication. API keys, custom roles
with equivalent privileges, and unauthenticated requests do not get the override.

Pass the result as `isAdmin` to `hasEntityAccess` and `buildEntityReadAccessQuery`
to allow private access and owner-only operations. Omit it for operations that
require an ACL grant, such as execution. The owner and stored ACL stay unchanged.
Never accept `isAdmin` from request input or an ACL entry. Feature and space checks
still apply when the ACL filter returns `match_all`.

```ts
const isAdmin = isEntityAccessControlAdmin(core, request);
const canManage = hasEntityAccess({
  accessControl: entity.access_control,
  ownerId: entity.owner_id,
  profileId,
  roles: [],
  isAdmin,
});
```

## Audit logging

Call `logEntityAccessControl(core, request, params)` at the server authorization or
storage boundary. Use `denied` for a failed ACL check, `admin_override` only when
access needs the override, and `update` after an ACL write succeeds. Pass the
entity type, ID, and operation. For updates, pass the previous and current owner
and ACL. The helper records these fields, not the entity contents. Core Security
adds the caller and request context when a request is provided.

Actions use `<entityType>_access_control_<action>` and respect the existing Kibana
audit configuration and ignore filters. An override event records an authorization
decision, not successful completion of the requested operation.
