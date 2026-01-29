---
title: ES|QL Plugin Guide for Agents
---

# ES|QL (@kbn/esql)

Shared plugin providing the ES|QL editor, triggers, and server-side extensions/auto-complete APIs.

## Public API
- Main component: `ESQLLangEditor` (`public/create_editor.tsx`)
- Entry point: `public/index.ts`
- Use when embedding ES|QL in apps (Lens, Maps, ML, Alerts, Unified Search).

## Server API
Server-side routes and extensions registry live under `server/`.
Key routes include:
- `/internal/esql/autocomplete/join/indices`
- `/internal/esql/autocomplete/timeseries/indices`
- `/internal/esql/autocomplete/inference_endpoints/{taskType}`
- `/internal/esql_registry/extensions/{query}`

Extensions registry:
- Solution-scoped (es, oblt, security, workplaceai).
- Only returns indices that exist in the instance.

## Key concepts
- ES|QL editor is UI-only; data fetching is owned by the consuming app.
- Triggers for controls and query updates live in `public/triggers/`.
- Registry is the integration point for recommended queries and fields.

## Change guidance
- Add new commands using `ADD_COMMAND_GUIDE.md`.
- Grammar updates come from Elasticsearch; keep changes isolated and well-tested.
- Respect solution scoping when registering extensions.

## Testing
- Unit tests: `jest.config.js`
- Integration tests: `jest.integration.config.js`
- Tests live in `public/**`, `server/**`, and `server/integration_tests/**`.
- Example: `yarn test:jest src/platform/plugins/shared/esql`
- If a verifier sub-agent exists (e.g., `kibana-verifier` or `verifier`), run it and include its findings in the test notes.

## Escalation
If changes affect editor integrations or extension registry behavior, coordinate with the owning solution teams.

## References
- `src/platform/plugins/shared/esql/README.md`
- `src/platform/plugins/shared/esql/server/README.md`
- `src/platform/plugins/shared/esql/ADD_COMMAND_GUIDE.md`
