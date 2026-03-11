# Adding New Filters/Tags Guide

This guide covers the complete process of adding custom filters or tags to the templating engine.

Adding a new filter/tag requires updates in multiple places:

1. **Engine registration** (server-side)
2. **UI parsing** (frontend validation)
3. **Autocompletion** (UI suggestions)
4. **OSS contribution** (optional, recommended)

## Step 1: Register in the Engine

**File:** [`templating_engine.ts`](./templating_engine.ts)

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

## Step 2: Add to UI Liquid Package

The UI uses liquidjs for validation. Register the filter in the validation instance:

```typescript
// src/platform/plugins/shared/workflows_management/public/features/validate_workflow_yaml/lib/validate_liquid_template.ts

function getLiquidInstance(): Liquid {
  if (!liquidInstance) {
    liquidInstance = new Liquid({
      strictFilters: true,
      strictVariables: false,
    });
    
    // TODO: This duplicate registration will be refactored to use a single source of truth
    // for filter registration. Filters should be registered once and shared between
    // server-side execution and client-side validation.
    
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

## Step 3: Add to Autocompletion

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

## Step 4: Write Tests

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

## Step 5: Contribute to OSS (Optional)

If you want to contribute your filter to the [liquidjs](https://github.com/harttle/liquidjs) project:

1. Open an issue or PR on the liquidjs repository
2. Once your contribution is merged and released:
   - **Update liquidjs version** in `package.json`
   - **Remove custom registration** from Kibana code (filter now built-in)
   - **Update autocompletion** to reflect it's now a standard filter
   - **Update tests** if behavior changed


## Adding Custom Tags

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

## Best Practices

1. **Naming**: Use snake_case for filter names (Liquid convention)
2. **Type Safety**: Check input types before processing
3. **Error Handling**: Return original value on errors (graceful degradation)
4. **Documentation**: Document filter behavior and examples
5. **Testing**: Cover edge cases (null, undefined, wrong types)
6. **OSS First**: Contribute to liquidjs when possible

---

## Engine Configuration

### Supported Features

✅ **Standard Liquid Features:**
- Variables and filters
- Tags (if, for, assign, case, etc.)
- Liquid blocks
- Filter chaining
- String, number, boolean, array, object types

✅ **Kibana Extensions:**
- `${{ }}` expression evaluation syntax
- Custom filters
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

## Additional Resources

- [Liquid Template Language](https://shopify.github.io/liquid/)
- [liquidjs Documentation](https://liquidjs.com/)
- [liquidjs GitHub](https://github.com/harttle/liquidjs)
