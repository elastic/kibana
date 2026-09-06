# Connector action contract: `isTool` flag

## Rule

Every connector action declares an `isTool` boolean:

| Value | Visibility | Intended use |
|-------|-----------|--------------|
| `isTool: true` | Exposed to Agent Builder / MCP as a callable **agent tool** | Interactive, low-volume, LLM-invoked actions |
| `isTool: false` | **Workflow/ingest-only** — not visible to agents | Batch ETL, pagination, high-volume data fetch |

## Why the split matters

Ingest actions page through large datasets and must not be handed to an LLM as a tool.
An agent calling `listAllIssues` would generate massive tool output, exhaust token budgets,
and produce non-deterministic results. Instead, ingest actions run inside workflow steps
with deterministic pagination and bulk indexing.

## Enforcement

- Connector specs in `kbn-connector-specs` declare `isTool` per action in the action definition.
- The Agent Builder tool registry filters by `isTool: true` — ingest-only actions never appear as agent tools.
- Workflow step definitions can reference any action regardless of `isTool`.

## Examples

### `isTool: true` (agent tool)
- `github.createIssue` — LLM creates a single issue interactively
- `slack.postMessage` — LLM sends a message in response to a conversation
- `salesforce.getCase` — LLM looks up a single case by ID

### `isTool: false` (ingest-only)
- `github.runQueryTemplate` — paginated GraphQL query for bulk issue ingest
- `slack.getChannelHistory` — paginated channel message fetch
- `salesforce.soqlIngest` — paginated SOQL cursor for bulk case ETL
- `google_drive.listFilesIngest` — metadata-only file listing for bulk indexing
