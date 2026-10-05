# Entity access control UI

`AccessControlForm` provides visibility selection, profile search, an owner row,
and removable user entries.
Consumers provide the roles, profile data, search callback, and save behavior.
The form has no plugin service dependency.

Pass profile IDs in `id`. Keep the form disabled while saving. Retain entries whose
profiles cannot be loaded, so owners can still remove them. Use server permissions
to decide who can edit the form.

Pass `canManage` when server permissions allow the caller to manage access. Wait for the current profile lookup to finish before enabling this notice.
If the current user is not the owner, the form shows an admin notice and lets
them add themselves to the ACL. The owner stays excluded from suggestions.
