# Search onboarding agent

Agent configuration files tailored to search solution onboarding. Guides developers from
"I want search" to a working Elasticsearch experience — understanding intent, recommending
an approach, designing mappings, and generating production-ready code.

## Package contents

```
.elasticsearch-agent/
  agents/
    <agent-name>/
      AGENTS.md             ← source of truth for agent instructions (YAML front matter + body)
  skills/
    recipes/                ← use-case guides (keyword, semantic, hybrid, RAG, etc.)
      <skill-name>/
        SKILL.md            ← source of truth for each skill (YAML front matter + body)
src/
  agents/
    <agent-name>.ts         ← generated — do not edit directly
    index.ts                ← generated barrel — do not edit directly
  skills/
    <skill_name>.ts         ← generated — do not edit directly
    index.ts                ← generated barrel — do not edit directly
index.ts                    ← re-exports everything from src/agents and src/skills
build                       ← regenerates all TypeScript from the markdown sources
scripts/generate.js         ← reads AGENTS.md + SKILL.md files → generates .ts
```

## Exports

The package exports an agent and a set of skills:

- `agents` — array of all agent objects
- `skills` — array of all skill objects (keyword search, semantic search, hybrid search, RAG, vector database, catalog/e-commerce)

Each agent and skill object is generated from its markdown source file, which carries YAML
front matter (id, name, description, labels, avatar fields) followed by the instruction body.

### Kibana Agent Builder

The `search_getting_started` plugin registers the agent via `@kbn/agent-builder-server`,
using the exported `agents` & `skills`

## Development

- **Agent instructions**: edit `.elasticsearch-agent/agents/<agent-name>/AGENTS.md`
- **Skill content**: edit the relevant `SKILL.md` under `.elasticsearch-agent/skills/recipes/<skill-name>/`
- All files under `src/` are generated — **do not edit them directly**
- Run `./build` to regenerate the TypeScript exports from the markdown sources and reformat with Prettier
- Updated allow list of agents & skills in `x-pack/platform/packages/shared/agent-builder/agent-builder-server/allow_lists.ts`


## `build` script

1. `node scripts/generate.js` — parses content from each `AGENTS.md` and `SKILL.md`, writes `src/agents/*.ts` and `src/skills/*.ts`, and generates barrel `index.ts` files in each directory
2. `prettier --write src/agents src/skills` — formats the generated files
