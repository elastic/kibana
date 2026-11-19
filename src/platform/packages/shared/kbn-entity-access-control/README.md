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
The package does not access storage, look up user profiles, or grant feature privileges.

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

`await isEntityAccessControlAdmin(core, request, authz)` uses Kibana’s authorization helper
to check an unregistered application privilege. Administrators qualify through wildcard application grants,
such as those in the Stack `superuser` and Serverless project `admin` roles. Ordinary
feature grants do not. Routes must use full authentication. API keys and
unauthenticated requests do not get the override. Failed privilege checks deny it.

Pass the result as `isAdmin` to `hasEntityAccess` and `buildEntityReadAccessQuery`
to allow private access and owner-only operations. Omit it for operations that
require an ACL grant, such as execution. The owner and stored ACL stay unchanged.
Never accept `isAdmin` from request input or an ACL entry. Feature and space checks
still apply when the ACL filter returns `match_all`.

```ts
const isAdmin = await isEntityAccessControlAdmin(core, request, authz);
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
storage boundary. `resolveEntityAccess` distinguishes normal access, an admin
override, and denial without repeating the permission check. Use `denied` for a
failed ACL check, `admin_override` only when access needs the override, and
`update` after an ACL write succeeds. Pass the
entity type, ID, and operation. For updates, pass the previous and current owner
and ACL. The helper records a summary and one event per added, removed, or changed user.
It records visibility and owner changes, omits unchanged entries, and does not
include entity contents. Core Security
adds the caller and request context when a request is provided.

Actions use `<entityType>_access_control_<action>` and respect the existing Kibana
audit configuration and ignore filters. An override event records an authorization
decision, not successful completion of the requested operation. Searches, lists,
batch lookups, and filters do not emit ACL events.
For layered authorization, audit denials at each rejecting boundary and record
an override at the final permission check before the operation.
