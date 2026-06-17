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
