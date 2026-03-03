# Foreach Step

The `foreach` step iterates over an array and executes its nested steps once for each item in the array.

## Configuration

- **`name`**: Unique step identifier
- **`type`**: Must be `"foreach"`
- **`foreach`**: Expression that evaluates to an array (required)
- **`steps`**: Array of steps to execute for each iteration (minimum 1 step, required)

## Foreach Expression Evaluation Flow

The foreach expression is evaluated using a specific priority to determine the array to iterate over.

### Evaluation Priority

1. **Template Expression Detection**: Check if expression starts with `{{` and ends with `}}`
2. **Expression Evaluation** (if template expression) OR **Template Rendering** (if not)
3. **JSON Parsing** (if result is string)
4. **Array Validation** (final check)

### Detailed Flow

#### Step 1: Template Expression Detection

#### Path A: Expression Evaluation (`{{ }}` or `${{ }}`)

If the expression starts with `{{` and ends with `}}`, it's evaluated as an expression:

**Behavior:**
- Expression is evaluated and type is preserved
- Result can be an array (used directly), string (Stringify json), or other type (error)
- Both `{{ }}` and `${{ }}` syntax work identically for foreach

#### Path B: Template Rendering

If the expression is NOT a template expression, it's rendered as a template string:

**Behavior:**
- Expression is rendered as a template string
- Any `{{ }}` templates within the string are evaluated
- Result is always a string
- String is then parsed as JSON

**Examples:**
```yaml
# Direct JSON string
foreach: '["item1", "item2", "item3"]'
# Result: String → JSON parse → Array

# JSON string with embedded templates
foreach: '[{{ steps.getCount }}, {{ steps.getCount | plus: 1 }}]'
# Result: Rendered string → JSON parse → Array
```

#### Step 2: JSON Parsing (if string result)

If the evaluated/rendered result is a string, it's parsed as JSON.

#### Step 3: Array Validation

The result must be an array, otherwise, an error is thrown

### Flow Diagram

```
Foreach Expression
         ↓
[1] Check: starts with '{{' and ends with '}}'?
         ↓
    ┌────┴────┐
    │         │
   Yes       No
    │         │
    ↓         ↓
[2A] Expression    [2B] Template
     Evaluation        Rendering
         ↓                ↓
    Result (any)      String
         │                │
         └──────┬─────────┘
                ↓
         [3] Is string?
                ↓
         ┌──────┴──────┐
         │             │
        Yes           No
         │             │
         ↓             │
    [3A] JSON parse    │
         │             │
         └──────┬──────┘
                ↓
         [4] Array Validation
                ↓
         Final Array
```

## Expression Types

### 1. Template Expression (`{{ }}` or `${{ }}`)

**Syntax:** Expression wrapped in `{{ }}` or `${{ }}`

**Evaluation:** Expression evaluation (preserves type)

**Use when:** Array comes from context variables (step outputs, inputs, consts)

```yaml
foreach: "{{ steps.getData.output.items }}"
foreach: "${{ steps.getData.output.items }}"  # Same behavior
```

**Flow:** Expression evaluation → Array (direct) OR String → JSON parse → Array

### 2. JSON String

**Syntax:** Plain JSON array string

**Evaluation:** Template rendering → JSON parse

**Use when:** Static array known at definition time

```yaml
foreach: '["item1", "item2", "item3"]'
```

**Flow:** Template rendering → String → JSON parse → Array

### 3. JSON String with Templates

**Syntax:** JSON string containing `{{ }}` template expressions

**Evaluation:** Template rendering → JSON parse

**Use when:** Building array dynamically with known structure

```yaml
foreach: '[{{ steps.getCount }}, {{ steps.getCount | plus: 1 }}]'
```

**Flow:** Template rendering → Evaluate templates → Rendered string → JSON parse → Array


## Context Variables

During foreach iteration, these context variables are available:

- **`foreach.item`**: Current item in the iteration
- **`foreach.index`**: Zero-based index of current iteration
- **`foreach.total`**: Total number of items in the array
- **`foreach.items`**: Complete array being iterated over

**Examples:**
```yaml
message: "Processing {{ foreach.item.name }} ({{ foreach.index | plus: 1 }}/{{ foreach.total }})"
```

### Accessing Parent Foreach Context

In nested foreach loops, access parent context via step references:

```yaml
steps:
  - name: outer-foreach
    type: foreach
    foreach: "{{ outerItems }}"
    steps:
      - name: inner-foreach
        type: foreach
        foreach: "{{ innerItems }}"
        steps:
          - name: log-both
            type: console
            with:
              message: "Outer: {{ steps.outer-foreach.index }}, Inner: {{ foreach.index }}"
```

## Execution Flow

1. **Initialization**: Evaluate `foreach` expression → if empty array, skip to exit
2. **Iteration**: Enter scope → execute nested steps → advance to next item
3. **Completion**: Exit foreach → continue to next step

Each iteration runs in an isolated scope.

## Error Scenarios

- **Non-array result**: Throws error with expression and resolved type
- **Invalid JSON**: Throws parsing error with the invalid string
- **Missing expression**: Throws error requiring foreach configuration

## Related Documentation

- [Templating Engine](../../templating_engine.md) - Template syntax and evaluation

**Related Files:**
- Main implementation: [`enter_foreach_node_impl.ts`](./enter_foreach_node_impl.ts)
- Exit implementation: [`exit_foreach_node_impl.ts`](./exit_foreach_node_impl.ts)
- Tests: [`tests/enter_foreach_node_impl.test.ts`](./tests/enter_foreach_node_impl.test.ts), [`tests/exit_foreach_node_impl.test.ts`](./tests/exit_foreach_node_impl.test.ts)
