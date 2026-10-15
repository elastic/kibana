# Managed child service-account inheritance

`workflow.execute` and `workflow.executeAsync` can delegate the parent's service account to a managed child. The service-account feature flag must be enabled. The engine loads the latest saved child definition for each call and retains that execution snapshot even if a trusted publisher updates the definition during admission; there is no revision pinning or child approval bundle.

```yaml
- name: child
  type: workflow.execute
  with:
    workflow-id: system-example-service-account-child
    run-as-mode: inherit
```

| Mode | Behavior |
| --- | --- |
| Omitted / `default` | Child's own SA when configured, otherwise the original caller. |
| `inherit` | Parent's SA; rejects a child with its own `settings.run_as`. |
| `override` | Parent's SA for this execution, even when the child has its own SA. Its saved binding is unchanged. |

The child ID and identity mode must be literal values in the saved parent definition, including calls in workflow-level `settings.on-failure.fallback` steps. Input values may use expressions. Existing child visibility rules still apply: managed parents can call managed children; unmanaged parents cannot discover them through workflow composition.

The YAML editor does not suggest `run-as-mode`: managed workflows are read-only, and editable unmanaged workflows cannot inherit identities. The schema still accepts the field in managed definitions. Editor validation rejects inheritance on unmanaged parents. The engine validates child eligibility and literal IDs. Managed definitions remain read-only in the editor and are configured by their publisher. Whether a child already has its own SA is checked at execution time.

## Authorization and lifetime

The identity resolver requires a managed parent at every delegated hop. Every inherited hop requires a managed child stored in the execution space or globally (`spaceId: "*"`), and a live parent SA request. Global definitions execute in the parent's space using the root parent's binding; the child needs no global binding. Definitions stored in another concrete space remain ineligible. The final live admission check requires the child to still exist, be managed, enabled, valid, and not deleted; it does not compare YAML or definition revisions. The original caller must still have execution access to the child. Admission also checks that the root parent's workload binding still matches the inherited SA. Further inherited calls retain that root binding.

The child execution stores its effective identity and root workload ID. The existing execution context retains the immediate parent workflow/execution IDs, and the execution retains its YAML and definition snapshot. Run and resume obtain fresh scoped credentials from the root binding, including after an async parent completes. Binding changes, revocation, or disabling SAs fail the child without falling back to the caller. `executedBy` continues to identify the initiating caller.

Force-deleting a global managed definition checks active executions across all spaces after disabling the definition. Deletion is rejected while any execution is active or the execution search is incomplete.

## Trust assumption

This approach trusts managed-workflow publishers. Ordinary workflow APIs reject managed definition edits, but the privileged managed-update API remains unchanged. A holder of `workflowsManagement:managed:update` with the required workflow access can edit a managed child and thereby affect code that executes under an inherited SA. Managed-only inheritance does not mitigate that privileged path. Trusted publisher updates are picked up by subsequent calls without revision approval.

## Local examples

Enable SAs and load `examples/developer_examples` and `examples/workflows_extensions_example`. The example-only `/internal/workflows_extensions_example/managed_service_account/{suffix}` endpoint installs the registered managed template, accepting bounded options rather than arbitrary YAML.

- `POST` with `{}` installs an unbound managed child. Use `.../{suffix}/global` to install it globally through the managed-workflows API; use the same path on `DELETE` to uninstall it. Global example mutations require superuser privileges; space-scoped workflow privileges are insufficient.
- `POST` with `{"serviceAccountId":"<SA>","childWorkflowId":"system-example-service-account-child","runAsMode":"inherit"}` installs a managed parent.
- Set `fallbackChild: true` on the parent to exercise its child call from a workflow-level failure handler.
- Set `asynchronous: true` for `workflow.executeAsync`, or `waitForInput: true` on the child to test durable resume.
- Set the example option `runAsMode: override` to use the parent SA over a child's saved SA.
- `POST .../{suffix}/run` executes the example; `DELETE .../{suffix}` uninstalls it.

The Scout `service_account_inheritance.spec.ts` suite covers these paths using real plugin installation and scoped execution credentials.

The inheritance Scout suite currently targets local stateful Kibana + Elasticsearch, as requested for this implementation. Serverless/UIAM delegation and resume need a separate validation run with that backend and its authorization setup; stateful results do not establish serverless compatibility.
