# Custom Connector Setup

Instructions for setting up a new custom connector spec (not MCP-backed).

## Run the Scaffold Generator

```bash
node scripts/generate connector <name> --id ".<id>" --owner "<team>"
```

Replace `<team>` with the GitHub team that will own this connector (e.g., `@elastic/response-ops`, `@elastic/workchat-eng`, `@elastic/workflows-eng`). If unsure, ask the user which team should own the connector in CODEOWNERS.

The generator creates:
- `src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/<name>.ts` — connector spec stub
- `src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/<name>.test.ts` — test stub
- `src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/icon/index.tsx` — icon placeholder
- `docs/reference/connectors-kibana/<kebab-name>-action-type.md` — documentation page

And updates:
- `src/platform/packages/shared/kbn-connector-specs/src/all_specs.ts` — export
- `src/platform/packages/shared/kbn-connector-specs/src/connector_icons_map.ts` — icon mapping
- `.github/CODEOWNERS` — ownership rule
- `docs/reference/connectors-kibana/_snippets/elastic-connectors-list.md` — connectors list
- `docs/reference/toc.yml` — table of contents

**After running the generator, go through each generated/updated file and fill in the TODO placeholders.**

## Implement the Connector Spec

Fill in the generated spec stub with actions, handlers, auth config, and tests. Additionally, create a `types.ts` file alongside the spec for input schemas and types.

### Auth Type Selection

- `'bearer'` — for services where the user provides a pre-obtained OAuth access token or API token (e.g., Google APIs, Notion, GitHub). Simplest option.
- `'api_key_header'` — for services that use API key authentication via a custom header.
- `'oauth_client_credentials'` — for services that use OAuth 2.0 Client Credentials flow (e.g., Microsoft/Azure services like SharePoint). Requires multi-field credential input (clientId, clientSecret, tenantId).

### Input Schemas & Types

Define Zod schemas and inferred types in a separate `types.ts` file alongside the connector spec. See [connector-patterns.md](connector-patterns.md) for the full pattern.

### SubActions

- Create subActions for core operations (search, list, get, download, etc.)
- Limit to ~5 high-level, generically useful subActions

### Connector ID Naming

- All connector IDs MUST start with a leading dot (e.g., `.servicenow`, `.notion`, `.github`)
- Before choosing an ID, search for existing connectors: `grep -r "id: '.servicenow'" --include="*.ts"`
- If a connector with that ID already exists, use a unique variant (like `.servicenow_search`)
- The ID must be unique across all connectors in the codebase

### Simplify the Configuration UI

1. **Schema config fields MUST have `.meta()` with a `label`** — Without a label, the field renders as an unlabeled input.
2. **Set sensible OAuth defaults** — Use the `defaults` object to pre-populate fields like `tokenUrl`.
3. **Hide the `scope` field** — Use `overrides.meta` to hide it: `scope: { hidden: true }`.
4. **Add a `placeholder` to `tokenUrl`** — Even with a default value, add a placeholder via `overrides.meta`.

See [connector-patterns.md](connector-patterns.md) for the full OAuth configuration pattern.

## Create Workflows

Create YAML workflow files in a `workflows/` directory alongside the spec. For the full YAML schema, invoke the `workflows-yaml-reference` skill (use the Skill tool with `skill: "workflows-yaml-reference"`).

Standard workflows:
1. **search.yaml** — Primary search. Focus on high-level metadata and matched text.
2. **get_{item}.yaml** — Retrieve specific items by ID. Include all metadata.
3. **list_{items}.yaml** — List available items/spaces/projects. Focus on high-level metadata.

Remember:
- Tag with `['agent-builder-tool']` to expose as AI tool
- Use `<%= {connector-type-without-dot}-stack-connector-id %>` for `connector-id`
- Use `${{ inputs.param_name }}` for input references

Import all workflow YAMLs in the connector spec and add them to `agentBuilderWorkflows`:

```typescript
import searchWorkflow from './workflows/search.yaml';
import getItemWorkflow from './workflows/get_item.yaml';

export const YourConnector: ConnectorSpec = {
  // ...
  agentBuilderWorkflows: [searchWorkflow, getItemWorkflow],
};
```

## Complete the Documentation

The generated documentation file at `docs/reference/connectors-kibana/<kebab-name>-action-type.md` contains TODO placeholders. Fill in:

1. **Connector configuration section** — Describe the credential the user needs to provide.
2. **Actions section** — Document each action with its parameters, types, and descriptions.
3. **Get API credentials section** — Step-by-step instructions for obtaining the credential.

Also update the snippet description in `docs/reference/connectors-kibana/_snippets/elastic-connectors-list.md`.

See existing docs (e.g., `google-drive-action-type.md`) for the expected style.

## ID Alignment

The following IDs **MUST all match exactly**:

1. `ConnectorSpec.metadata.id` in the connector spec
2. Key in `ConnectorIconsMap` in connector_icons_map.ts

**Before choosing an ID**, search for existing connectors using that ID.
