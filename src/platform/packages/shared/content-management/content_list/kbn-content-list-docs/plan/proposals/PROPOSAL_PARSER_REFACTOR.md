# Parser Refactoring - Improved Encapsulation

## Problem Statement

The original `parse_children.ts` had several issues:

1. **Tight Coupling**: Parser contained column-specific logic (e.g., Name column variants)
2. **Type Safety Violations**: Required casting to `any` to work around type issues
3. **Hard to Extend**: Adding new columns meant modifying the central parser
4. **Poor Encapsulation**: Column-specific knowledge scattered across files

## Solution: Column-Specific Parsers

Each column now owns its parsing logic through a `parseProps` function.

### Architecture

```
┌─────────────────────────────────────────┐
│      parse_children.ts (orchestrator)    │
│  - Iterates over React children         │
│  - Delegates to column-specific parsers │
│  - No column-specific logic             │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┬──────────┐
        │           │           │          │
        ▼           ▼           ▼          ▼
   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
   │  Name  │  │Updated │  │Created │  │Actions │
   │ Parser │  │   At   │  │   By   │  │ Parser │
   │        │  │ Parser │  │ Parser │  │        │
   └────────┘  └────────┘  └────────┘  └────────┘
```

### Key Components

#### 1. ParseColumnProps Type

```typescript
export type ParseColumnProps<TConfig = any> = (element: ReactElement) => TConfig;
```

Standard interface for all column parsers.

#### 2. Column Registry

```typescript
const COLUMN_PARSERS: Record<string, ParseColumnProps> = {
  name: parseNameColumnProps,
  updatedAt: parseUpdatedAtColumnProps,
  createdBy: parseCreatedByColumnProps,
  actions: parseActionsColumnProps,
};
```

Central lookup for column-specific parsers.

#### 3. Column-Specific Parsers

Each column exports:
- **Props type**: For the React component API
- **Config type**: Internal format for the builder
- **Parse function**: Transforms props to config

**Example: Name Column**

```typescript
// Public API
export type NameColumnProps = ColumnVariantProps<NameColumnVariants, NameColumnCommonProps>;

// Internal config
export interface NameColumnConfig {
  columnTitle?: string;
  width?: string;
  sortable?: boolean;
  render?: (item: ContentListItem) => ReactNode;
  variant?: string;
  showDescription?: boolean;
  showTags?: boolean;
}

// Parser
export function parseNameColumnProps(element: ReactElement): NameColumnConfig {
  const props = element.props || {};
  return {
    columnTitle: props.columnTitle,
    width: props.width,
    sortable: props.sortable,
    render: props.render,
    variant: props.variant,
    showDescription: props.showDescription,
    showTags: props.showTags,
  };
}
```

#### 4. Simplified Main Parser

```typescript
export function parseColumnsFromChildren(
  children: ReactNode,
  hasChildren: boolean
): [string[], ColumnConfigMap<readonly string[]>] {
  // ... setup code ...

  Children.forEach(children, (child) => {
    // ... validation ...

    // Use column-specific parser if available
    const parser = COLUMN_PARSERS[columnId];
    if (parser) {
      columnConfig[columnId] = parser(child as ReactElement);
    } else {
      // Fallback for custom columns
      columnConfig[columnId] = { ...child.props };
    }
  });

  return [columns, columnConfig];
}
```

## Benefits

### 1. **Type Safety**
- No more `any` casts
- Each column has strongly-typed config
- Compile-time validation

**Before:**
```typescript
const showDescription = (customConfig as any)._showDescription ?? true;
```

**After:**
```typescript
const customConfig = (typeof config === 'object' ? config : {}) as NameColumnConfig;
const showDescription = customConfig.showDescription ?? true;
```

### 2. **Encapsulation**
- Column logic stays with column
- Parser doesn't need to know column specifics
- Easy to understand and maintain

### 3. **Extensibility**
- Add new column: create parser, add to registry
- No modifications to central parser
- Plugin-style architecture

### 4. **Clear Separation of Concerns**

| Component | Responsibility |
|-----------|----------------|
| `parse_children.ts` | Orchestrate parsing, handle React children iteration |
| `*_builder.tsx` | Define props, config, parsing, and building logic |
| `*_spec.tsx` | Declarative marker component |
| `*_cell.tsx` | UI rendering |

### 5. **Testability**
- Test each parser independently
- Mock column parsers in main parser tests
- Clear boundaries

## File Changes

### Modified Files
- `columns/parse_children.ts` - Simplified to use registry
- `columns/component_types.ts` - Added `ParseColumnProps` type
- `columns/name/name_builder.tsx` - Added config type and parser
- `columns/updated_at/updated_at_builder.tsx` - Added config type and parser
- `columns/created_by/created_by_builder.tsx` - Added config type and parser
- `columns/actions/actions_builder.tsx` - Added config type and parser
- All column `index.ts` - Export parse functions

## Future Improvements

1. **Plugin System**: External columns could register their own parsers
2. **Validation**: Add runtime validation in parsers for better error messages
3. **Schema**: Consider using zod/yup for config validation
4. **Documentation**: Auto-generate prop docs from config types

## Migration Guide

For adding a new column:

1. Create `columns/my_column/my_column_builder.tsx`:
   ```typescript
   export type MyColumnProps = BaseColumnProps<{ /* specific props */ }>;
   export interface MyColumnConfig { /* internal config */ }
   export function parseMyColumnProps(element: ReactElement): MyColumnConfig {
     // Extract and return props
   }
   export const buildColumn: ColumnBuilder = (config, context) => {
     // Build EUI column
   };
   ```

2. Add to registry in `parse_children.ts`:
   ```typescript
   const COLUMN_PARSERS = {
     // ...
     myColumn: parseMyColumnProps,
   };
   ```

3. Update component types:
   ```typescript
   export interface ColumnNamespace {
     // ...
     MyColumn: (props: MyColumnProps) => ReactElement | null;
   }
   ```

That's it! The system is now extensible and type-safe.

