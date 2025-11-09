# Workflow Templating Engine

The Workflow Templating Engine provides powerful template rendering capabilities for workflows using the [Liquid](https://liquidjs.com/) templating language. This document covers the core concepts, syntax, configuration, and advanced features of the templating system.

## Table of Contents

1. [Syntax Overview](#syntax-overview)
2. [Error Message Retrieval](#error-message-retrieval)
3. [Template Rendering Behavior](#template-rendering-behavior)
4. [Engine Configuration](#engine-configuration)
5. [Adding New Filters/Tags Guide](#adding-new-filterstags-guide)

---

## Syntax Overview

The templating engine supports multiple syntax types for different use cases. Understanding when to use each syntax is crucial for effective template authoring.

### Simple String Templates (`{{ }}`)

The most common syntax for string interpolation. Variables and expressions are rendered as strings.

```yaml
message: "Hello {{ user.name }}!"
# Renders to: "Hello Alice!"
```

**Use when:**
- Rendering text output
- Building strings with variable content
- Creating messages, URLs, or text-based content

**Example:**
```yaml
with:
  url: "https://api.example.com/users/{{ user.id }}"
  message: "Processing {{ items | size }} items"
```


### Escaping Template Syntax

If you need to output literal `{{ }}` characters in your template (without them being interpreted as template syntax), use the `{% raw %}` tag:

```yaml
# If you need literal {{ }} in output
value: "{% raw %}{{ _ingest.timestamp }}{% endraw %}"
# Renders to: "{{ _ingest.timestamp }}" (literal text, not evaluated)
```

**Use when:**
- You need to output template syntax as literal text
- Passing template strings to external systems that use `{{ }}` syntax
- Creating examples or documentation within templates

**Example:**
```yaml
# Passing Elasticsearch ingest pipeline syntax
pipeline: |
  {
    "set": {
      "field": "timestamp",
      "value": "{% raw %}{{ _ingest.timestamp }}{% endraw %}"
    }
  }
# Result: The literal string "{{ _ingest.timestamp }}" is in the output
```

### Object/Array Templates

Templates can be embedded within nested objects and arrays. The engine recursively processes all string values.

```yaml
with:
  headers:
    Authorization: "Bearer {{ token }}"
    X-User-Id: "{{ user.id }}"
  tags:
    - "{{ tag1 }}"
    - "{{ tag2 }}"
```

**Use when:**
- Building complex nested structures
- Creating arrays with dynamic content
- Configuring objects with template values

### Expression Evaluation (`${{ }}`)

The `${{ }}` syntax evaluates expressions and preserves their original type (arrays, objects, booleans, numbers) instead of converting to strings.

```yaml
# Using {{ }} - converts to string
tags: "{{ inputs.tags }}"
# Result: tags is a string representation

# Using ${{ }} - preserves type
tags: "${{ inputs.tags }}"
# Result: tags is an actual array
```

**Use when:**
- You need to preserve data types (arrays, objects, booleans)
- Passing structured data to step parameters
- Avoiding string conversion of complex values

**Examples:**
```yaml
# Preserve array
tags: "${{ inputs.tags }}"
# If inputs.tags = ['admin', 'user'], result is an array, not a string

# Preserve object
metadata: "${{ inputs.metadata }}"
# If inputs.metadata = {version: '1.0'}, result is an object

# Preserve boolean
isActive: "${{ inputs.isActive }}"
# If inputs.isActive = true, result is boolean true, not string "true"

# Can use filters
items: "${{ inputs.items | slice: 0, 2 }}"
# Result is an array slice, not a string
```

**Important:** The `${{ }}` syntax only works when the entire string value is the template expression. It must start with `${{` and end with `}}`.

### Liquid Tags (`{% %}`)

Liquid tags provide control flow and logic. They use `{% %}` delimiters and don't produce output.

```yaml
message: |
  {% if user.role == 'admin' %}
    Welcome, administrator!
  {% else %}
    Welcome, user!
  {% endif %}
```

**Common tags:**
- `{% if %}...{% endif %}` - Conditional logic
- `{% for %}...{% endfor %}` - Loops
- `{% assign %}` - Variable assignment
- `{% case %}...{% endcase %}` - Switch statements

**Use when:**
- Adding conditional logic
- Iterating over collections
- Assigning variables for reuse

### Liquid Code Blocks (`{%- liquid ... -%}`)

Liquid blocks allow multiple Liquid statements in a single tag block, useful for complex logic.

```yaml
message: |
  {%- liquid
    assign greeting = "Hello"
    assign name = user.name
    echo greeting
    echo " "
    echo name
  -%}
```

**Use when:**
- Writing multiple Liquid statements
- Keeping logic compact
- Avoiding multiple tag pairs

**Syntax notes:**
- Opening: `{%- liquid` or `{% liquid`
- Closing: `-%}` or `%}`
- Statements are separated by newlines
- Whitespace control with `-` is optional

---

## Error Message Retrieval

The templating engine provides comprehensive error handling with detailed, user-friendly error messages.

### Error Processing Flow

1. **Error Capture**: Liquid parsing/rendering errors are caught
2. **Position Extraction**: Error positions are extracted from liquidjs error messages
3. **Message Normalization**: Technical details (line/column numbers) are removed for user-facing messages
4. **Token Identification**: Specific problematic tokens are identified when possible

### Error Message Format

Errors are normalized to remove technical details:

```
# Original liquidjs error:
"undefined filter: unknownFilter, line:5, col:12"

# Normalized user-facing error:
"undefined filter: unknownFilter"
```

### Error Position Extraction

The engine extracts precise error positions using multiple strategies:

1. **Token-based extraction**: Identifies specific problematic tokens (filters, tags, expressions)
2. **Line/column parsing**: Converts liquidjs line/column format to character offsets
3. **Pattern matching**: Uses regex patterns to find error locations
4. **Fallback**: Highlights the first character if no specific position found

### Error Types

#### Undefined Filter Errors
```yaml
# Template:
message: "{{ name | unknownFilter }}"

# Error:
"undefined filter: unknownFilter"
# Position: Highlights the filter name
```

#### Undefined Tag Errors
```yaml
# Template:
{% unknownTag %}

# Error:
"tag 'unknownTag' not found"
# Position: Highlights the tag name
```

#### Unclosed Expression Errors
```yaml
# Template:
message: "{{ user.name"

# Error:
"output '{{ user.name' not closed"
# Position: Highlights the unclosed expression
```

#### Invalid Expression Errors
```yaml
# Template:
message: "{{ }}"

# Error:
"invalid value expression"
# Position: Highlights the empty expression
```

---

## Template Rendering Behavior

The templating engine processes templates recursively through all data structures, handling different value types appropriately.

### Recursive Rendering

The engine traverses objects and arrays recursively, rendering all string values:

```typescript
// Input object
{
  message: "Hello {{ user.name }}",
  config: {
    url: "{{ api.url }}",
    headers: {
      Auth: "{{ token }}"
    }
  },
  tags: ["{{ tag1 }}", "{{ tag2 }}"]
}

// After rendering with context
{
  message: "Hello Alice",
  config: {
    url: "https://api.example.com",
    headers: {
      Auth: "abc123"
    }
  },
  tags: ["admin", "user"]
}
```

### Type Handling

#### Strings
- All string values are processed as templates
- Variables are interpolated
- Filters are applied
- Result is always a string

#### Numbers, Booleans, Null
- Primitive non-string values are returned as-is
- No template processing occurs
- Type is preserved

#### Arrays
- Each element is processed recursively
- String elements are rendered as templates
- Non-string elements are preserved

#### Objects
- Each property value is processed recursively
- Property keys are not processed (only values)
- Nested structures are fully traversed

### `${{ }}` vs `{{ }}` Behavior

#### `{{ }}` - String Rendering
```yaml
# Template
items: "{{ inputs.items }}"

# Context: inputs.items = ['a', 'b', 'c']
# Result: items = "a,b,c" (string representation)
```

#### `${{ }}` - Expression Evaluation
```yaml
# Template
items: "${{ inputs.items }}"

# Context: inputs.items = ['a', 'b', 'c']
# Result: items = ['a', 'b', 'c'] (actual array)
```

**Key Differences:**

| Feature | `{{ }}` | `${{ }}` |
|---------|---------|----------|
| Output Type | Always string | Preserves original type |
| Arrays | String representation | Actual array |
| Objects | String representation | Actual object |
| Booleans | String "true"/"false" | Boolean true/false |
| Numbers | String "123" | Number 123 |
| Filters | Applied, result stringified | Applied, type preserved |

### Null and Undefined Handling

- **Null values**: Returned as-is, not processed
- **Undefined variables**: Rendered as empty string in `{{ }}`, undefined in `${{ }}`
- **Missing context properties**: Treated as undefined

```yaml
# Template
message: "Hello {{ missing }}"

# Result (missing variable):
message: "Hello "
```

### Filter Application

Filters are applied during rendering and can be chained:

```yaml
# Single filter
name: "{{ user.name | upcase }}"

# Chained filters
data: "{{ jsonString | json_parse | json }}"
```

---

## Engine Configuration

The templating engine is configured with specific Liquid options that affect behavior and error handling.

### Custom Filter Registration

Custom filters are registered during engine initialization:

```typescript
this.engine.registerFilter('json_parse', (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return value; // Return original on parse failure
  }
});
```

**Current Custom Filters:**
- `json_parse`: Converts JSON strings to objects/arrays

---


### Liquid Standard Compliance

The engine follows the [Liquid template language](https://shopify.github.io/liquid/) specification with some Kibana-specific extensions.

### Supported Features

✅ **Standard Liquid Features:**
- Variables and filters
- Tags (if, for, assign, case, etc.)
- Liquid blocks
- Filter chaining
- String, number, boolean, array, object types

✅ **Kibana Extensions:**
- `${{ }}` expression evaluation syntax
- Custom `json_parse` filter
- Recursive object/array rendering
- Enhanced error messages

### Migration Considerations

When upgrading liquidjs:

1. **Check breaking changes**: Review liquidjs changelog
2. **Test custom filters**: Ensure compatibility
3. **Update error handling**: Adjust error message parsing if format changes
4. **Validate templates**: Test existing workflows

### Version Update Process

1. Update `package.json` dependency
2. Run tests: `yarn test templating_engine`
3. Test error message extraction
4. Validate UI parsing
5. Update documentation if behavior changes

---


## Adding New Filters/Tags Guide

This guide covers the complete process of adding custom filters or tags to the templating engine.

### Overview

Adding a new filter/tag requires updates in multiple places:
1. **Engine registration** (server-side)
2. **UI parsing** (frontend validation)
3. **Autocompletion** (UI suggestions)
4. **OSS contribution** (optional, recommended)

### Step 1: Register in the Engine

Add your filter to the `WorkflowTemplatingEngine` constructor:

```typescript
// src/platform/plugins/shared/workflows_execution_engine/server/templating_engine.ts

constructor() {
  this.engine = new Liquid({
    strictFilters: true,
    strictVariables: false,
  });

  // Register your custom filter
  this.engine.registerFilter('my_custom_filter', (value: unknown, ...args: unknown[]): unknown => {
    // Filter implementation
    if (typeof value !== 'string') {
      return value;
    }
    // Your filter logic here
    return transformedValue;
  });
}
```

**Filter Function Signature:**
```typescript
(value: unknown, ...args: unknown[]) => unknown
```

- `value`: The value being filtered (left side of `|`)
- `args`: Additional filter arguments (right side of `:`)
- Return: The transformed value

**Example:**
```typescript
this.engine.registerFilter('prefix', (value: unknown, prefix: unknown): unknown => {
  if (typeof value !== 'string' || typeof prefix !== 'string') {
    return value;
  }
  return `${prefix}${value}`;
});

// Usage: {{ name | prefix: "Mr. " }}
```

### Step 2: Add to UI Liquid Package

The UI uses liquidjs for validation. Register the filter in the validation instance:

```typescript
// src/platform/plugins/shared/workflows_management/public/features/validate_workflow_yaml/lib/validate_liquid_template.ts

function getLiquidInstance(): Liquid {
  if (!liquidInstance) {
    liquidInstance = new Liquid({
      strictFilters: true,
      strictVariables: false,
    });
    
    // Register all custom filters (for validation)
    liquidInstance.registerFilter('json_parse', (value: unknown): unknown => {
      return value; // No-op for validation
    });
    
    // Add your filter here
    liquidInstance.registerFilter('my_custom_filter', (value: unknown): unknown => {
      return value; // No-op for validation
    });
  }
  return liquidInstance;
}
```

**Why?** This prevents parsing errors when users type the filter in the UI editor.

### Step 3: Add to Autocompletion

Add your filter to the autocompletion provider:

```typescript
// src/platform/plugins/shared/workflows_management/public/widgets/workflow_yaml_editor/lib/autocomplete/suggestions/liquid/liquid_completions.ts

export const LIQUID_FILTERS = [
  // ... existing filters ...
  {
    name: 'my_custom_filter',
    description: 'Adds a prefix to a string',
    insertText: 'my_custom_filter: "${1:prefix}"',
    example: '{{ "value" | my_custom_filter: "prefix_" }} => "prefix_value"',
  },
];
```

**Fields:**
- `name`: Filter name (must match registration)
- `description`: User-facing description
- `insertText`: Snippet for autocompletion (use `${1:placeholder}` for arguments)
- `example`: Usage example

### Step 4: Write Tests

Add tests for your filter:

```typescript
// src/platform/plugins/shared/workflows_execution_engine/server/templating_engine.test.ts

describe('my_custom_filter', () => {
  it('should add prefix to string', () => {
    const template = '{{ name | prefix: "Mr. " }}';
    const context = { name: 'John' };
    const result = templatingEngine.render(template, context);
    expect(result).toBe('Mr. John');
  });

  it('should handle non-string values', () => {
    const template = '{{ number | prefix: "prefix" }}';
    const context = { number: 123 };
    const result = templatingEngine.render(template, context);
    expect(result).toBe('123'); // Returns original value
  });
});
```

### Step 5: Contribute to OSS (Recommended)

The best approach is to contribute your filter to the [liquidjs](https://github.com/harttle/liquidjs) project so it's available to all users.

#### 5a. Open an Issue

1. Go to [liquidjs GitHub issues](https://github.com/harttle/liquidjs/issues)
2. Create an issue describing your filter/tag
3. Explain the use case and proposed API
4. Wait for maintainer feedback

#### 5b. Open a Pull Request

1. Fork the liquidjs repository
2. Implement your filter/tag
3. Add tests
4. Update documentation
5. Submit PR with clear description

#### 5c. Update Kibana After Merge

Once merged and released:

1. **Update liquidjs version** in `package.json`
2. **Remove custom registration** from Kibana code (filter now built-in)
3. **Update autocompletion** to reflect it's now a standard filter
4. **Update tests** if behavior changed

### Adding Custom Tags

Tags follow a similar process but use `registerTag`:

```typescript
this.engine.registerTag('my_tag', {
  parse(tagToken, remainTokens) {
    // Parse tag arguments
  },
  render(context, emitter) {
    // Render tag output
  },
});
```

Tags are more complex than filters. Refer to [liquidjs tag documentation](https://liquidjs.com/tutorials/register-filters-tags.html#register-tags) for details.

### Best Practices

1. **Naming**: Use snake_case for filter names (Liquid convention)
2. **Type Safety**: Check input types before processing
3. **Error Handling**: Return original value on errors (graceful degradation)
4. **Documentation**: Document filter behavior and examples
5. **Testing**: Cover edge cases (null, undefined, wrong types)
6. **OSS First**: Contribute to liquidjs when possible

---

## Additional Resources

- [Liquid Template Language](https://shopify.github.io/liquid/)
- [liquidjs Documentation](https://liquidjs.com/)
- [liquidjs GitHub](https://github.com/harttle/liquidjs)
