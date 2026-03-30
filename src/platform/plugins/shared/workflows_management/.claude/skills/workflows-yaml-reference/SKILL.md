---
name: workflows-yaml-reference
description: Reference the workflows example library when answering questions about Elastic Workflows YAML syntax, structure, patterns, or examples. Use when the user asks about workflows, YAML syntax, workflow steps, triggers, Liquid templating, or needs examples of workflow patterns.
---

# Workflows YAML Reference

This skill helps you reference the workflows example library located at `https://github.com/elastic/workflows` when answering questions about Elastic Workflows YAML syntax.

## When to Use This Skill

Use this skill when the user asks about:
- Workflows YAML syntax and structure
- How to write workflow steps, triggers, or actions
- Liquid templating and filters in workflows
- Examples of specific workflow patterns
- How to use workflow features (foreach, conditionals, error handling, etc.)
- Integration examples (Slack, Splunk, JIRA, etc.)

## Workflow Library Location

The workflows example library is located at:
```
https://github.com/elastic/workflows
```

## Key Documentation Files

Always reference these files for comprehensive information:

1. **README.md** - Overview, quick start, and common patterns
2. **docs/schema.md** - Complete YAML schema reference
3. **docs/concepts.md** - Detailed concepts including Liquid templating
4. **docs/importing.md** - How to import workflows into Kibana

## Workflow Categories

The library is organized by use case:

| Category | Path | Description |
|----------|------|-------------|
| **Examples** | `workflows/examples/` | Getting started demos |
| **Security** | `workflows/security/` | Detection, response, enrichment |
| **Integrations** | `workflows/integrations/` | Splunk, Slack, Jenkins, JIRA, etc. |
| **Search** | `workflows/search/` | ES\|QL, semantic search |
| **AI Agents** | `workflows/ai-agents/` | AI-powered automation |
| **Data** | `workflows/data/` | ETL and data management |
| **Utilities** | `workflows/utilities/` | Common utility workflows |
| **Observability** | `workflows/observability/` | Monitoring and analysis |

## Workflow Structure Reference

Every workflow follows this structure:

```yaml
name: "Workflow Name"              # Required
description: "What it does"        # Optional
tags: ["category", "type"]         # Optional

triggers:                          # Optional (defaults to manual)
  - type: manual | scheduled | alert

consts:                            # Optional - workflow constants
  api_key: "value"

inputs:                            # Optional - runtime parameters
  - name: param_name
    type: string
    required: true

steps:                             # Required - at least one step
  - name: "step_name"
    type: "action.type"
    with:
      param: value
```

## Common Patterns to Reference

When the user asks about specific patterns, reference these examples:

### 1. Basic Workflow Structure
**Example**: `workflows/examples/national-parks-demo.yaml`
- Shows complete workflow structure
- Demonstrates index operations, search, and foreach loops
- Well-commented for learning

### 2. HTTP API Integration
**Example**: `workflows/security/enrichment/ip-reputation-check.yaml`
- Making HTTP requests
- Error handling with retries
- Processing API responses

### 3. Elasticsearch Operations
**Example**: `workflows/search/semantic-knowledge-search.yaml`
- ES|QL queries
- Search operations
- Working with search results

### 4. Foreach Loops
**Example**: `workflows/security/enrichment/rootcausefromdiscover.yaml`
- Iterating over arrays
- Accessing loop context (`foreach.item`)
- Nested step execution

### 5. Conditional Logic
**Example**: `workflows/security/detection/hash-threat-check.yaml`
- Using `type: if` steps
- Condition expressions
- Branching logic

### 6. Scheduled Triggers
**Example**: Any workflow with scheduled trigger
- Simple interval format (`every: "6h"`)
- Recurrence rules (rrule)

### 7. Integration Examples
- **Slack**: `workflows/integrations/slack/`
- **Splunk**: `workflows/integrations/splunk/`
- **JIRA**: `workflows/integrations/jira/`
- **Jenkins**: `workflows/integrations/jenkins/`

## Liquid Templating Quick Reference

Workflows use Liquid templating extensively. Key concepts:

### Variable Syntax
```yaml
{{ consts.api_key }}              # Constants
{{ inputs.target_ip }}            # Runtime inputs
{{ steps.search.output.hits }}    # Step outputs
{{ foreach.item._id }}            # Loop context
```

### Common Filters
```yaml
{{ text | upcase }}               # String manipulation
{{ items | size }}                # Array length
{{ data | json }}                 # Convert to JSON
{{ value | default: "fallback" }} # Default values
{{ array | map: "name" }}         # Extract property
{{ items | where: "status", "active" }} # Filter array
```

### Control Flow
```yaml
{%- if condition -%}
  content
{%- elsif other -%}
  other content
{%- else -%}
  fallback
{%- endif -%}

{%- for item in items -%}
  {{ item.name }}
{%- endfor -%}
```

## How to Use This Skill

When answering workflow questions:

1. **Read relevant documentation first**
   - For syntax questions: Read `docs/schema.md`
   - For concepts/templating: Read `docs/concepts.md`
   - For examples: Browse appropriate category in `workflows/`

2. **Find relevant examples**
   - Use Glob to find workflows by pattern
   - Read example files that match the user's need
   - Reference specific line numbers when citing examples

3. **Provide complete answers**
   - Show the relevant YAML structure
   - Explain the syntax using examples from the library
   - Reference specific files for deeper exploration

4. **Cite sources**
   - Always mention which example file you're referencing
   - Use code references with line numbers when showing examples
   - Point users to documentation files for comprehensive details

## Example Workflow

When the user asks "How do I make an HTTP request in a workflow?", follow this approach:

1. Read `docs/schema.md` for the HTTP action syntax
2. Find an example using Glob: `workflows/security/enrichment/*.yaml`
3. Read a relevant example like `ip-reputation-check.yaml`
4. Show the HTTP step structure with proper syntax
5. Reference the example file for complete context

## Progressive Disclosure

For complex questions:
1. Start with a concise answer and basic example
2. Reference the relevant documentation file for details
3. Point to specific example workflows for complete implementations
4. Only read additional files if the user needs more depth

## Important Notes

- The workflows library is comprehensive - use it as the source of truth
- Always verify syntax by checking actual examples, not assumptions
- Liquid templating is powerful - reference `https://liquidjs.com/filters/overview.html` for filters
- Examples are well-commented - read them to understand patterns
- When unsure, read the documentation files first
