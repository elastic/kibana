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

On the server, use `isEntityAccessControlAdmin(core, request)` to check whether
the authenticated caller has the exact `superuser` role. It uses Core Security's
`authc.getCurrentUser` API. Custom roles with equivalent privileges do not grant
the override. API keys and requests without an authenticated user do not grant it.
Routes must use full authentication to make the caller's roles available.

Pass the result as `isAdmin` to `hasEntityAccess` and `buildEntityReadAccessQuery`.
Administrators can access private entities and perform owner-only operations.
Consumers can omit `isAdmin` for operations that still require an explicit grant,
such as execution.
The override does not change the owner or stored ACL. Never accept `isAdmin` from
request input or an ACL entry. Feature and space checks still apply, including
to queries where the ACL filter returns `match_all`.

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
