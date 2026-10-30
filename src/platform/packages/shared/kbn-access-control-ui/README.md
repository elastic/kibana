# @kbn/access-control-ui

Shared UI for platform object-level security. Every type with an access policy uses the same panel.

- `ObjectAccessPanel` loads an object's access and lets access managers change general access,
  named grants, and ownership. Everyone else sees what they can do.
- `AccessDraftEditor` edits access before an object exists, for private creation.
- `useAccessPolicy` and `useObjectAccess` load the policy and the caller's permissions, for example
  to disable a consumer's own controls.

The server decides every permission. The UI renders what the access control API returns and
computes no access itself. Consumers pass their own wording through `AccessCopy`.
