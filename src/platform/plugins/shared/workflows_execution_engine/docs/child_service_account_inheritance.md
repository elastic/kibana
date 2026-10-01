# Child workflow service account inheritance

`workflow.execute` and `workflow.executeAsync` support `runAsMode`:

- `default` (omitted): child service account when configured, otherwise the original caller.
- `inherit`: parent service account; approval rejects a child with its own `settings.run_as`.
- `override`: parent service account for this execution, even when the child has its own binding. The child's saved binding is unchanged.

`inheritRunAs: true` remains a shorthand for `runAsMode: inherit`. Do not combine the two fields. Inherited calls require a literal `workflow-id`; inputs may use expressions.

```yaml
name: Parent
settings:
  run_as: kibana/example
enabled: true
triggers:
  - type: manual
steps:
  - name: child
    type: workflow.execute
    with:
      workflow-id: child-workflow
      runAsMode: inherit
```

## Approving code for the delegated identity

Save the parent, select **Review child versions**, inspect the diff for every inherited call (including nested calls), then select **Approve reviewed versions**. Approval requires workflow read/execute privileges, edit access to the parent, and `manage_security`. The reviewer must have read/execute access to every child. Managed parent approval is not supported through this editor.

The server stores the approved snapshots and their identity, call paths, document incarnation, versions, approver and time in protected parent metadata. No revision/hash belongs in YAML. Normal saves, imports, restores and child edits cannot refresh approvals. Changing the parent's service account discards its approvals. Moving a call, changing its child ID, or changing its identity mode requires an appropriate approval.

An edited child appears as **unapproved changes**. New parent executions continue using the last approved code. The execution version records the approved version, even when a newer version is saved. Approval captures the exact versions reviewed: concurrent edits return a conflict and require another review. Parent metadata is written with optimistic concurrency control. Existing executions retain their original snapshots after reapproval.

Nested inherited calls are recursively approved and copied into the execution. Approvals stored on an editable unbound child are never trusted. Approval rejects cycles, depths over ten calls, more than fifty inherited calls, or more than five MB of YAML. Non-inherited calls retain their normal identity and authorization behavior.

## Execution and revocation

Children still require original-caller execution access and enabled, existing workflows in the same space. Disabled/deleted or recreated children cannot use old approvals. Admission selects the immutable approved code; later edits cannot alter it. Each child has its own task and retains the original caller plus inherited identity through waits, retries and resume. SA credentials are minted from the root parent's existing workload binding. Revoking/changing that binding, disabling the SA feature, or losing execution access fails closed.

The approval endpoints are internal GET/POST `/internal/workflows/{id}/child_approvals`. POST accepts only the opaque `reviewToken` returned by GET; callers cannot upload approved snapshots. Successful and denied approval attempts are audited.
