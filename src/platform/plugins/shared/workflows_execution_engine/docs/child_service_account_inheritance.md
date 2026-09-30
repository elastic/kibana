# Inherit a service account when calling a child workflow

`workflow.execute` and `workflow.executeAsync` accept `with.inheritRunAs` (default: `false`). When it is `true`, the child executes as the parent's service account. Service accounts must be enabled, the parent must be executing as a service account, and the child must not declare its own `settings.run_as`.

Inheritance delegates the parent's privileges to the child's code. Every inherited call therefore requires an approved `expectedRevision`: the lowercase SHA-256 digest of the **exact saved child YAML**, including whitespace and its final newline. Both `workflow-id` and `expectedRevision` must be literal values in the parent definition. Inputs can still use expressions.

```yaml
name: Approved parent
settings:
  run_as: kibana/investigation-reader
enabled: true
triggers:
  - type: manual
steps:
  - name: investigate
    type: workflow.execute
    with:
      workflow-id: saved-child-id
      inheritRunAs: true
      expectedRevision: "<64-character SHA-256 of the saved child's YAML>"
      inputs:
        message: "Investigate this event"
```

Use `workflow.executeAsync` with the same parameters to let the parent continue without waiting for the child.

## Approve a child revision

1. Save the child without `settings.run_as` and review its full definition, including any nested inherited calls.
2. Read its saved YAML from `GET /api/workflows/workflow/{id}` and hash the decoded `yaml` field without normalizing or trimming it. For example, pipe the JSON response into:

   ```sh
   node -e 'let body = ""; process.stdin.on("data", chunk => body += chunk); process.stdin.on("end", () => console.log(require("node:crypto").createHash("sha256").update(JSON.parse(body).yaml).digest("hex")));'
   ```

3. An administrator with `manage_security` saves that hash in the bound parent's `expectedRevision`. The existing bound-workflow authorization applies to all parent definition edits, including hash changes.
4. If the child is edited, subsequent inherited calls fail before a child execution is scheduled. Review the new child definition and explicitly update the parent approval. Capturing the current hash automatically when the parent starts is not an approval.

The engine verifies the saved child snapshot with a real-time read and executes that exact snapshot. An edit after admission does not change an already admitted execution, including after waits, retries, or approvals. New invocations must pass revision validation again.

## Identity and lifetime

The child's execution records `effectiveIdentity.id` and `effectiveIdentity.inheritedFrom`, including the immediate parent workflow/execution, approved revision, and original bound workload. Execution history marks its run-as identity as inherited. `executedBy` continues to identify the initiating caller.

Each child task, including a resumed task after its parent has completed, obtains fresh credentials from the original parent's workload binding. It does not retain the parent's temporary credentials. Changing or removing that binding, disabling service accounts, or deleting the account prevents fresh credentials from being issued; the child fails without falling back to the caller. An already active scoped request follows the same revocation/refresh behavior as other service-account executions.

The original caller still needs execution access to the child. Inherited calls are limited to children in the same space. Further inheritance through a child uses the same original workload binding, with a separate approved hash for each edge in the chain.

When `inheritRunAs` is omitted or `false`, existing behavior is preserved: use the child's own service account if configured, otherwise the original caller. This version does not override a child's configured account and does not allow skipping the revision check.
