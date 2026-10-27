# MCP stack compatibility spec

`.mcp` is registered with `createConnectorTypeFromSpec` and `stackCompat`. It is not exported from `all_specs.ts`.

## Preserved

- Connector id `.mcp`, name `MCP`, enterprise license, and the same four feature ids
- Legacy config and secrets schemas, including `secrets: {}` and no `secrets.authType`
- Public params schema: `{ subAction, subActionParams }` with unknown `subActionParams` keys allowed at that layer
- Per-action validation errors: `Request validation failed (...)`
- Unknown sub-action text from the sub-action framework
- Success payload `{ status: 'ok', data, actionId }`
- User errors thrown as `TaskRunError` with `USER`; other errors rethrown raw
- Isolated `test` client, always terminated. Client name `kibana-mcp-connector-<connectorId>`
- Pooled `listTools` and `callTool` lease key: connector id, client type `mcp`, shared auth, saved-object version
- `listTools` cache key, TTL, size, and `forceRefresh`
- Auth header merge: config headers, then auth headers, then secret headers
- Request-byte accounting on a `listTools` miss and on `callTool`
- Public UI registration under `stack_connectors/public/connector_types/mcp`

## Not changed on purpose

- `getConnectorSpec('.mcp')` stays `undefined`. Agent Builder does not list MCP as a generic agent connector. Workflows keeps its static MCP schema map.
- The spec-generated UI form is not used. The registered public model still writes the legacy shape.
- `selectedActions` is not enforced. The legacy executor did not have that gate.

## Rollback

N writes the same config and secrets bytes N-1 writes. N-1 still has the legacy executor and the same schemas. No saved-object migration and no new persisted field. An intermediate Serverless release is not required for this change.
