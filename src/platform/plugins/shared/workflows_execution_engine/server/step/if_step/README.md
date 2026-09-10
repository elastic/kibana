# If Step

The `if` step provides conditional execution of workflow steps based on boolean expressions or KQL (Kibana Query Language) conditions.

## Syntax

```yaml
steps:
  - name: check-status
    type: if
    condition: "{{ steps.getData.output.status }}: active"
    steps:
      ...
    else:
      ...
```

## Configuration

- **`name`**: Unique step identifier
- **`type`**: Must be `"if"`
- **`condition`**: Boolean expression or KQL condition string (required)
- **`steps`**: Array of steps to execute when condition is `true` (minimum 1 step, required)
- **`else`**: Array of steps to execute when condition is `false` (optional)

## Condition Evaluation Flow

The if step evaluates conditions using a specific priority and flow to determine which branch to execute.

### Evaluation Priority

The condition evaluation follows this priority order:

1. **Template Rendering** (always first)
2. **Boolean Evaluation** (if boolean)
3. **KQL Evaluation** (if string)
4. **Default Handling** (if undefined)

### Detailed Flow

#### Step 1: Template Rendering

The condition is first processed through the templating engine:

```typescript
// From enter_if_node_impl.ts
const renderedCondition = 
  this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(thenNode.condition);
```

**What happens:**
- Template expressions like `{{ }}` or `${{ }}` are evaluated
- Variables are replaced with their actual values
- Result can be boolean, string, or other type

#### Step 2: Type Check and Evaluation

After template rendering, the result is evaluated based on its type:

##### Boolean Result (Priority 1)

If the rendered condition is a boolean, it's used directly:

**Use when:** `${{ }}` syntax that evaluates to a boolean

##### Undefined Result (Priority 2)

If the rendered condition is `undefined`, it defaults to `false`:

##### String Result (Priority 3) - KQL Evaluation

If the rendered condition is a string, it's evaluated as a KQL expression:

**Use when:** Plain string conditions or template expressions that render to strings

```yaml
condition: "status: active"  # KQL expression
condition: "steps.getData.output.status: {{ steps.resolveStatusStep.output }}"  # Template → KQL
```

##### Invalid Type (Error)

If the rendered condition is neither boolean, string, nor undefined, an error is thrown:


**Causes errors:** Objects, arrays, numbers, or other non-boolean/non-string types

### Complete Flow Diagram

```
Condition String/Expression
         ↓
[1] Template Rendering (renderValueAccordingToContext)
         ↓
    Rendered Result
         ↓
[2] Type Check
         ↓
    ┌────┴────┬──────────┬──────────┐
    │         │          │          │
Boolean   String    Undefined   Other
    │         │          │          │
    │         │          │          │
[3] Return  [4] KQL    [5] Return  [6] Error
  Value    Evaluation    false
    │         │          │
    └─────────┴──────────┘
         ↓
    Final Boolean
         ↓
    Branch Selection
```

## Condition Types

The `condition` field supports two types of expressions:

### 1. Boolean Expression (`${{ }}`)

When using `${{ }}` syntax, the expression must evaluate to a boolean value.

**Behavior:**
- Expression is evaluated and must return `true` or `false`
- `undefined` values default to `false`
- Other types (objects, arrays, numbers) throw an error


### 2. KQL Expression (String)

When using string conditions (with or without `{{ }}` templating), the condition is evaluated as a KQL expression. The condition string is first rendered as a template, then evaluated as KQL.

## KQL Condition Syntax

The if step supports a subset of KQL (Kibana Query Language) for condition evaluation.

### Equality

```yaml
condition: "status: active"
condition: "user.role: admin"
condition: "isActive: true"
condition: "count: 42"
condition: "users[0].name: Alice"  # Array index access
```

### Range Operators

```yaml
condition: "count >= 100"
condition: "count <= 1000"
condition: "count > 50"
condition: "count < 200"
condition: "count >= 100 and count <= 1000"  # Combined
```

### Wildcard Matching

```yaml
condition: "fieldName:*"  # Field exists
condition: "user.name: John*"  # Starts with
condition: "user.name: *Doe"  # Ends with
condition: "txt: *ipsum*"  # Contains
condition: "user.name: J*n Doe"  # Pattern
```

### Logical Operators

```yaml
condition: "status: active and isEnabled: true"  # AND
condition: "status: active or status: pending"  # OR
condition: "not status: inactive"  # NOT
condition: "status: active and (role: admin or role: moderator)"  # Nested
```

### Property Path Access

```yaml
condition: "user.info.name: John Doe"  # Nested
condition: "steps.fetchData.output.status: completed"  # Deep nesting
condition: "users[0].name: Alice"  # Array access
condition: "users.0.name: Alice"  # Alternative syntax
```

## Examples

### Boolean Expression

```yaml
steps:
  - name: check-enabled
    type: if
    condition: "${{ inputs.isEnabled }}"
    steps:
      - name: process-enabled
        type: http
    else:
      - name: log-disabled
        type: console
```

### KQL with Templating

```yaml
steps:
  - name: check-status
    type: if
    condition: "{{ steps.fetchData.output.status }}: completed"
    steps:
      - name: process-data
        type: http
```

### Complex KQL

```yaml
steps:
  - name: check-complex
    type: if
    condition: "status: active and (count >= 100 or role: admin)"
    steps:
      - name: process-authorized
        type: http
```

## Best Practices

1. **Use boolean expressions for simple checks**: `${{ }}` syntax is clearer for boolean values
2. **Use KQL for complex conditions**: KQL provides powerful query capabilities
3. **Template conditions when needed**: Use `{{ }}` to inject dynamic values into KQL
4. **Handle both branches**: Use `else` when both paths need processing
5. **Keep conditions readable**: Complex conditions can be hard to debug
6. **Test edge cases**: Test with `true`, `false`, `undefined`, and missing fields

## Error Scenarios

### Invalid KQL Syntax

```yaml
condition: "invalid""condition"  # Syntax error
```

**Error:** Syntax error in condition for step

### Invalid Condition Type

```yaml
condition: "${{ inputs.config }}"  # Returns object, not boolean
```

**Error:** Invalid condition type - expected boolean or string


### Missing Field in KQL

```yaml
condition: "nonExistentField: value"
```

**Behavior:** Returns `false` (field doesn't exist), no error thrown

## Supported KQL Features

### ✅ Supported

- Equality checks, range operators (`>=`, `<=`, `>`, `<`)
- Wildcard matching (`*`, `field:*`)
- Logical operators (`and`, `or`, `not`)
- Nested property access, array index access
- Boolean, string, and number comparisons

### ❌ Not Supported

- Full-text search, regex patterns, complex aggregations
- Date/time functions, math operations in conditions
