# Entity access control UI

`AccessControlForm` uses the sharing pattern from Agent Builder conversations:
visibility selection, profile search, an owner row, and removable user entries.
Consumers provide the roles, profile data, search callback, and save behavior.
The form has no plugin service dependency.

Pass profile IDs in `id`. Keep the form disabled while saving. Retain entries whose
profiles cannot be loaded, so owners can still remove them. Use server permissions
to decide who can edit the form.
