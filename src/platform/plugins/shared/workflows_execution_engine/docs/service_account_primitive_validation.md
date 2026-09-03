# Service account primitive validation

This integration validates Security's workload-binding contract through one saved-workflow path.
It is not the complete Workflows service-account product.

## Baseline

UIAM supports creating, getting, listing, deleting, and exchanging a native organization service
account through the project's mTLS identity. The Workflows slice consumes the higher-level Kibana
operation contract from
[PR #286664](https://github.com/elastic/kibana/pull/286664), which keeps the ephemeral credential
inside Security and gives the execution engine a scoped request.

## Covered path

- `isEnabled`: reject `settings.run_as` where service-account execution is unavailable.
- `registerOperation`: claim `workflow_execution` during plugin setup.
- `attach` and `getBinding`: authorize and verify `settings.run_as` on create.
- Reattach: reauthorize the declared account before a YAML update is persisted.
- `detach` and `getBinding`: remove and verify the binding before deleting a saved workflow or
  removing `settings.run_as`.
- `withScopedRequest`: run saved manual and scheduled executions with the scoped request.
- Fail closed when the YAML declaration and the authorized binding do not match.
- Keep test and ephemeral executions on their caller-scoped request even if their inline YAML
  contains `settings.run_as`.
- Persist the triggering user as `executedBy` and the service account as `effectiveIdentity`.

The attach/detach paths compensate the workflow write when possible so a failed operation does not
silently leave the YAML and binding out of sync.

## Validation status

Automated Scout coverage creates UIAM service accounts directly, saves and rebinds a workflow with
`settings.run_as`, and verifies manual and scheduled executions. The workflow uses `console` and
`elasticsearch.request` steps against a seeded index, and a separate run verifies an `ai.agent`
step. The authorization matrix also covers admin binding, editor execution, metadata updates, YAML
denial, and service-account listing.

The thin Workflows UI lists and selects service accounts, resolves names for persisted identities,
shows the triggering and effective identities, and exposes service-account details when hovering
over `settings.run_as` in the YAML editor.

## Backend status

The Workflows integration is backend-neutral because it only consumes Core's operation handle.
Security currently implements workload bindings for UIAM. Its Elasticsearch backend returns
`501 Not Implemented` for these operations; stateful validation therefore depends on the
Elasticsearch implementation tracked by
[Kibana issue #284464](https://github.com/elastic/kibana/issues/284464).

A real end-to-end checkpoint currently needs a Serverless environment or local UIAM deployment,
Kibana project certificate and project context, an Encrypted Saved Objects encryption key, and a
service account that Kibana can exchange.

## Bottlenecks exposed

- The UIAM capability is usable, but Kibana's token-exchange and workload-binding contract is still
  a draft dependency rather than a stable merged API.
- The initial attach policy requires `manage_security`, so this slice validates an admin-binding
  MVP rather than self-service binding.
- Workflow storage and workload bindings are separate writes. The implementation compensates
  failures, but concurrent updates still need an explicit consistency strategy.
- Only Serverless has a working binding backend. The Elasticsearch backend is not implemented.
- A local end-to-end run requires cloud project mTLS material that normal stateful development
  does not provide.

## Deliberately not covered

- Service-account creation and full management UI.
- Bulk create/import and managed-workflow synchronization.
- Event-driven, nested, resume, and retry identity propagation.
- Complete audit coverage.
- Elasticsearch-backed workload bindings.
