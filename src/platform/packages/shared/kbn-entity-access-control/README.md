# Entity access control

Shared ACL types, input validation, and permission checks. The stored shape follows
Agent Builder conversations:

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

Consumers must check space and feature privileges before checking the ACL. They
must apply the same policy to searches, counts, reads, writes, and execution.
Missing ACLs and administrator access require an explicit consumer policy.

`prepareAccessControl` validates the input, rejects duplicate users, removes owner
entries, and preserves membership dates. Public entities can retain entries for
additional permissions, such as editing. A consumer that forbids public entries
can add that restriction without changing the stored shape.

Agent Builder can keep its `member` role, private default, and public-entry policy
when adopting these types. No field rename or data conversion is required.
