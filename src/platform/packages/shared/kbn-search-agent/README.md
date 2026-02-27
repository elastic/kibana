# Search onboarding agent

Agent configuration files tailored to search solution onboarding. Guides developers from
"I want search" to a working Elasticsearch experience — understanding intent, recommending
an approach, designing mappings, and generating production-ready code.

## Package contents

```
search_agent_instructions.ts    ← source of truth for all instructions
index.ts                        ← exports searchAgentInstructions
build                           ← regenerates AGENTS.md + packages zip
scripts/generate_agents_md.js   ← extracts the template literal → markdown
install-agent.sh                ← remote installer (AGENTS.md workflow)
install-cursor.sh               ← remote installer (Cursor rules + skills)
AGENTS-elasticsearch-append.md  ← appended to the project's AGENTS.md on install
.elasticsearch-agent/
  AGENTS.md                     ← generated — do not edit directly
  skills/recipes/               ← use-case guides (keyword, semantic, hybrid, RAG, etc.)
```

## Instruction set

The package exports a single instruction set — `searchAgentInstructions` — which is the
canonical conversational playbook for the Elasticsearch onboarding agent. It covers intent
discovery, data understanding, approach recommendation, mapping design, code generation,
testing, and iteration.

This same export is consumed by two runtimes:

### External LLM agents (Cursor, CLI)

`./build` generates `.elasticsearch-agent/AGENTS.md` from the TypeScript source and packages
it into a zip alongside the recipe skills and the `AGENTS-elasticsearch-append.md` file.
The install scripts download and unpack this zip into the developer's project.

### Kibana Agent Builder

The `search_getting_started` plugin registers the agent via `@kbn/agent-builder-server` with
`replace_default_instructions: true`, providing the full playbook as the system prompt.

## Installation

Two install scripts are provided, each tailored to a different workflow.

### Generic (AGENTS.md-based)

Installs `.elasticsearch-agent/AGENTS.md`, recipe skills, and appends an Elasticsearch
reference to the project's `AGENTS.md`.

```
Fetch and run this remote script:
curl -sSL https://raw.githubusercontent.com/elastic/kibana/releases/install-agent.sh | sh
Then help me get started with Elasticsearch.
```

### Cursor-specific

Converts the agent into a Cursor rule (`.cursor/rules/elastic.mdc`) and copies recipe skills
into `.cursor/skills/`. Does not modify `AGENTS.md`.

```
Fetch and run this remote script:
curl -sSL https://raw.githubusercontent.com/elastic/kibana/releases/install-cursor.sh | sh
Then help me get started with Elasticsearch.
```

## Development

- `search_agent_instructions.ts` is the **source of truth**. The
  `.elasticsearch-agent/AGENTS.md` file is generated — do not edit it directly.
- Run `./build` to regenerate `AGENTS.md` from the TypeScript source and
  package the zip file for usage outside of Kibana.

Prompt during development (points to PR branch):

```
Fetch and run this remote script:
curl -sSL https://raw.githubusercontent.com/wildemat/kibana/search-agent/src/platform/packages/shared/kbn-search-agent/install-agent.sh | sh
Then help me get started with Elasticsearch.
```
