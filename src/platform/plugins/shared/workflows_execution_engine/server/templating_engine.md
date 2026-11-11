# Workflow Templating Engine

The Workflow Templating Engine provides template rendering capabilities for workflows using the [Liquid](https://liquidjs.com/) templating language.

---

## Syntax Overview

### Simple String Templates (`{{ }}`)

String interpolation. Variables and expressions are rendered as strings.

```yaml
message: "Hello {{ user.name }}!" # Result: "Hello Alice"
url: "https://api.example.com/users/{{ user.id }}" # Result: "https://api.example.com/users/12
```

### Escaping Template Syntax

Use `{% raw %}` to output literal `{{ }}` characters:

```yaml
# If you need literal {{ }} in output
value: "{% raw %}{{ _ingest.timestamp }}{% endraw %}" # Result: "{{ _ingest.timestamp }}"
```

### Object/Array Templates

Templates can be embedded within nested objects and arrays. The engine recursively processes all string values.

```yaml
with:
  headers:
    Authorization: "Bearer {{ token }}"
  tags:
    - "{{ tag1 }}"
    - "{{ tag2 }}"
```

### Expression Evaluation (`${{ }}`)

Preserves original type (arrays, objects, booleans, numbers) instead of converting to strings.

```yaml
# Using {{ }} - converts to string
tags: "{{ inputs.tags }}"  # Result: string representation

# Using ${{ }} - preserves type
tags: "${{ inputs.tags }}"  # Result: actual array
```

**Important:** Must start with `${{` and end with `}}` (entire string value).

```yaml
tags: "${{ inputs.tags }}"  # ✅ Works
items: "${{ inputs.items | slice: 0, 2 }}"  # ✅ Works with filters
```

#### Page inputs

A `page` trigger declares its own `inputs`. Steps read the values a page visitor submitted as `page.inputs.<name>`, not as `inputs.<name>`. `inputs.*` holds only the values of manual runs, API calls, and child runs, so a template shows where its data comes from. A workflow can declare inputs on both its `manual` and `page` triggers.

```yaml
triggers:
  - type: page
    title: Report an incident
    inputs:
      properties:
        summary:
          type: string
steps:
  - name: log
    type: console
    with:
      message: "{{ page.inputs.summary }}"
```

#### Expressions in provided input values

A caller can pass a `${{ }}` string as an input value when it starts a run. The engine evaluates that value only when the execution's `triggeredBy` is `manual`. Every other `triggeredBy` keeps the value as a literal string, for example child runs (`workflow-step`), scheduled runs, alerts, event triggers, Agent Builder hooks (`agent-builder-hook`), and workflow pages (`page`). A `page` visitor is anonymous, and an expression can read `consts` and the rest of the render context.

The engine records `triggeredBy: manual` when a caller does not set it. This includes runs from the Run API and the UI, and plugin callers that call `runWorkflow` or `executeWorkflow` without `triggeredBy`. A plugin that passes values it does not control, such as LLM output, must set its own `triggeredBy` to keep them literal.

The rule applies only to values the caller provides. Expressions that the workflow author writes still render:

- Input `default` values render for every run.
- A parent renders the `with.inputs` of a `workflow.execute` or `workflow.executeAsync` step before the child run starts. The child gets the rendered values.

| `triggeredBy` | Provided `"${{ consts.token }}"` becomes |
|---------------|-----------------------------------------|
| `manual` | The value of `consts.token` |
| Any other value | The literal string `"${{ consts.token }}"` |

### Liquid Tags (`{% %}`)

Control flow and logic. Common tags: `{% if %}`, `{% for %}`, `{% assign %}`, `{% case %}`.

```yaml
message: |
  {% if user.role == 'admin' %}
    Welcome, administrator!
  {% endif %}
```

### Liquid Code Blocks (`{%- liquid ... -%}`)

Multiple Liquid statements in a single tag block.

```yaml
message: |
  {%- liquid
    assign greeting = "Hello"
    echo greeting
    echo " "
    echo user.name
  -%}
```

---

## Template Rendering Behavior

The templating engine processes templates recursively through all data structures.

### Recursive Rendering

The engine traverses objects and arrays recursively, rendering all string values:

```yaml
# Input
message: "Hello {{ user.name }}"
config:
  url: "{{ api.url }}"
tags: ["{{ tag1 }}", "{{ tag2 }}"]

# After rendering
message: "Hello Alice"
config:
  url: "https://api.example.com"
tags: ["admin", "user"]
```

### Type Handling

- **Strings**: Processed as templates, variables interpolated, filters applied
- **Numbers, Booleans, Null**: Returned as-is, no template processing
- **Arrays**: Each element processed recursively
- **Objects**: Each property value processed recursively (keys not processed)

### `${{ }}` vs `{{ }}` Behavior

| Feature | `{{ }}` | `${{ }}` |
|---------|---------|----------|
| Output Type | Always string | Preserves original type |
| Arrays | String representation | Actual array |
| Objects | String representation | Actual object |
| Booleans | String "true"/"false" | Boolean true/false |
| Numbers | String "123" | Number 123 |
| Filters | Applied, result stringified | Applied, type preserved |

### Null and Undefined Handling

- **Null values**: Returned as-is
- **Undefined variables**: Empty string in `{{ }}`, undefined in `${{ }}`
- **Missing context properties**: Treated as undefined

### Filter Application

Filters are applied during rendering and can be chained:

```yaml
name: "{{ user.name | upcase }}"
data: "{{ jsonString | json_parse | json }}"
```
