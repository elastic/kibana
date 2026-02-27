# Search onboarding agent

Agent configuration files tailored to search solution onboarding.

## Instruction sets

This package exports two instruction sets, each designed for a different runtime:

### `AGENTS.md`

The full conversational playbook used by external LLM agents (Cursor, CLI). It drives a
multi-turn guided flow: understand intent, understand data, recommend an approach, walk through
the mapping, generate code, test, and iterate. The LLM has direct control over the conversation
and can ask one question at a time.

### `searchAgentInstructionsAgentBuilder`

A condensed, domain-expertise-focused instruction set for the Kibana Agent Builder built-in agent.
Agent Builder uses a two-phase architecture (research agent -> answer agent) where a hardcoded base
system prompt drives tool-calling behavior. Custom instructions extend that base prompt rather than
replacing it.

Because of this architecture, the Agent Builder version:

- Provides domain expertise (search approach selection, mapping design, query patterns, code
  generation standards) instead of controlling conversational flow.
- Uses tagged sections (similar to Observability and Security agents) so the model can reference
  specific guidance during tool selection and response generation.
- Does **not** use `replace_default_instructions` — it works with the default research-then-answer
  loop rather than fighting it.

## Installation

Copy this prompt to your LLM (won't work until it's properly hosted in kibana):

```
Fetch and run this remote command:

curl -sSL https://raw.githubusercontent.com/elastic/kibana/releases/install-agent.sh | sh

Then help me get started with Elasticsearch.
```

## Development

- Main agent instructions live in `AGENTS.md`. Make updates there and to the
  skill files in `.elasticsearch-agent`.
- Agent Builder instructions live in `search_agent_instructions_agent_builder.ts`.
- Run `./build` to regenerate the zip file for usage outside of kibana

Prompt during development (points to pr branch):

```
Fetch and run this remote script:
curl -sSL https://raw.githubusercontent.com/wildemat/kibana/search-agent/src/platform/packages/shared/kbn-search-agent/install-agent.sh | sh
Then help me get started with Elasticsearch.
```
