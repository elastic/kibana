---
name: create-connector
description: Creates a new connector spec with workflows for Kibana. Use when asked to create (or add) a new connector, integration, or data source.
allowed-tools: WebFetch, WebSearch, Read, Grep, Glob, Write, Edit, Bash, Skill
context: fork
argument-hint: [3rd-party-service-name]
---

# Create a Connector

We're going to create a new connector spec with workflows for **$0**. The connector will enable Kibana to interact with the third-party service, and workflows will expose operations as tools for AI agents.

## Reference Materials

- **[reference/connector-patterns.md](reference/connector-patterns.md)** — Directory structure, file templates, and registration patterns
- **Workflow YAML syntax** — When you need to write or understand workflow YAML files, invoke the `workflows-yaml-reference` skill (use the Skill tool with `skill: "workflows-yaml-reference"`)

## Step 1: Determine the Connector Strategy

Check if $0 has an official hosted MCP server. If so, creating an MCP-native connector is preferred.

**MCP server available?** → Read [reference/mcp-connector-setup.md](reference/mcp-connector-setup.md) and follow its steps.

**No MCP server available?** → Read [reference/custom-connector-setup.md](reference/custom-connector-setup.md) and follow its steps.

Follow only the steps for the chosen path. Do not mix them.

## Step 2: Create the Connector Spec

Create the connector spec in `src/platform/packages/shared/kbn-connector-specs/src/specs/{connector_name}/`.

Follow the patterns in [reference/connector-patterns.md](reference/connector-patterns.md):

1. **`{connector_name}.ts`** — ConnectorSpec definition with metadata, auth, schema, actions, and `agentBuilderWorkflows`
2. **`types.ts`** — Zod input schemas and inferred TypeScript types for each action
3. **`{connector_name}.test.ts`** — Unit tests
4. **`icon/index.tsx`** — Brand icon component

Register in `src/platform/packages/shared/kbn-connector-specs/src/all_specs.ts` and `connector_icons_map.ts`.

Replace the placeholder icon with a proper brand icon. Search for existing SVG/PNG files in:
- `src/platform/packages/shared/kbn-connector-specs/src/specs/*/icon/`
- `x-pack/platform/plugins/shared/stack_connectors/public/connector_types/{connector}/`

## Step 3: Create Workflows

Create YAML workflow files in a `workflows/` directory alongside the connector spec. For the full YAML schema, invoke the `workflows-yaml-reference` skill.

Standard workflows:
1. **search.yaml** — Primary search. Focus on high-level metadata and matched text.
2. **get_{item}.yaml** — Retrieve specific items by ID. Include all metadata.
3. **list_{items}.yaml** — List available items/spaces/projects. Focus on high-level metadata.

Remember:
- Tag with `['agent-builder-tool']` to expose as AI tool
- Use `<%= {connector-type-without-dot}-stack-connector-id %>` for `connector-id`
- Use `${{ inputs.param_name }}` for input references
- Import all workflow YAMLs in the connector spec and list them in `agentBuilderWorkflows`

## Step 4: Create Tests

Add tests following the existing examples:

1. **Connector spec tests** — See `google_drive/google_drive.test.ts` or `slack/slack.test.ts` for the pattern.
2. **Workflow behavioral tests** — See `google_drive/workflows.test.ts` or `slack/workflows.test.ts` for the pattern.

You do not need to execute the tests — just create the files.

## Step 5: Write Documentation

Create a connector doc page in `docs/reference/connectors-kibana/{name}-action-type.md`.

### Prerequisites

This step requires documentation skills from https://github.com/elastic/elastic-docs-skills. Check availability by invoking `docs-check-style` (use the Skill tool). If it fails with "skill not found", stop and tell the user:

> Documentation skills are not installed. Please install them:
>
> ```bash
> curl -sSL https://raw.githubusercontent.com/elastic/elastic-docs-skills/main/install.sh | bash
> ```
>
> Then re-run this step.

### Write the doc page

1. Read 1-2 existing connector docs from `docs/reference/connectors-kibana/` as templates (for example, `zendesk-action-type.md`, `jira-cloud-action-type.md`). Follow the same structure.
2. Write the new doc page. Use `docs-syntax-help` if unsure about MyST Markdown syntax.
3. Run these skills on the new file and fix any issues:
   - `frontmatter-description` — generate the `description` frontmatter field
   - `page-opening-optimizer` — verify H1 and opening paragraph
   - `applies-to-tagging` — validate `applies_to` block
   - `docs-check-style` — check Elastic style guide compliance

### Update navigation and listings

1. Add an entry in `docs/reference/toc.yml` under the connectors section.
2. Add a row in `docs/reference/connectors-kibana/_snippets/elastic-connectors-list.md`.

Once you are done developing the connector spec, workflows, tests, and documentation, let the user review your work before next steps.

## Important Notes

- **Stop if architectural gaps emerge** — This skill is for adding connectors to the catalog, not for enhancing platform features
- **Keep workflows focused** — Each workflow should help end users perform a specific operation against the third-party service
- **Follow existing patterns** — Look at Slack, GitHub, Google Drive, and ServiceNow connectors for reference
- **DO NOT modify existing documentation** — There may be existing connectors with similar names. Do not modify their documentation files.
