# Recipes

Copy-paste patterns for common assembly tasks. Every recipe uses the same fictional `<ActionBar>` example.

## Table of contents

- [0. Define the assembly](#0-define-the-assembly)
- [1. Create a simple part](#1-create-a-simple-part)
- [2. Create a part with preset variants](#2-create-a-part-with-preset-variants)
- [3. Create a part with presets and a base component](#3-create-a-part-with-presets-and-a-base-component)
- [4. Build a compound component namespace](#4-build-a-compound-component-namespace)
- [5. Parse children and filter by part](#5-parse-children-and-filter-by-part)
- [6. Render passthrough React node children](#6-render-passthrough-react-node-children)
- [7. Resolve presets with `resolve`](#7-resolve-presets-with-resolve)
- [8. Resolve with runtime context](#8-resolve-with-runtime-context)
- [9. Tag an existing component with `tagComponent`](#9-tag-an-existing-component-with-tagcomponent)
- [10. Test declarative components](#10-test-declarative-components)

---

## 0. Define the assembly

Before defining any parts, create the assembly itself. This is the root that all parts and presets belong to.

```typescript
// action_bar/assembly.ts
import { defineAssembly } from '@kbn/content-list-assembly';

export const actionBar = defineAssembly({ name: 'ActionBar' });
```

---

## 1. Create a simple part

The ActionBar needs a spacer to push items apart. A spacer has no preset variants -- it's just a single component with props. Use `createComponent` for this case.

```typescript
// action_bar/spacer/part.ts
import { actionBar } from '../assembly';

export const spacer = actionBar.definePart({ name: 'spacer' });

export interface SpacerProps {
  size?: 's' | 'm' | 'l';
}

export const Spacer = spacer.createComponent<SpacerProps>();
```

```typescript
// action_bar/spacer/index.ts
export { Spacer, type SpacerProps } from './part';
```

Consumer usage:

```tsx
<ActionBar>
  <ActionBar.Spacer size="l" />
</ActionBar>
```

---

## 2. Create a part with preset variants

The ActionBar also needs filters, and filters come in different flavors (dropdown, toggle). Each flavor is a preset with its own typed props. Use `definePart` with a preset-to-props mapping and `createPreset` for each variant.

```typescript
// action_bar/filter/part.ts
import { actionBar } from '../assembly';

export interface DropdownFilterProps {
  field: string;
  label: string;
  options: string[];
}

export interface ToggleFilterProps {
  field: string;
  label: string;
}

export interface FilterPresets {
  dropdown: DropdownFilterProps;
  toggle: ToggleFilterProps;
}

export const filter = actionBar.definePart<FilterPresets>({ name: 'filter' });
```

```typescript
// action_bar/filter/dropdown.ts
import { filter } from './part';

export { type DropdownFilterProps } from './part';

export const DropdownFilter = filter.createPreset({ name: 'dropdown' });
```

```typescript
// action_bar/filter/toggle.ts
import { filter } from './part';

export { type ToggleFilterProps } from './part';

export const ToggleFilter = filter.createPreset({ name: 'toggle' });
```

```typescript
// action_bar/filter/index.ts
export { DropdownFilter, type DropdownFilterProps } from './dropdown';
export { ToggleFilter, type ToggleFilterProps } from './toggle';
```

Consumer usage:

```tsx
const { Filter } = ActionBar;

<ActionBar>
  <Filter.Dropdown field="status" label="Status" options={['open', 'closed']} />
  <Filter.Toggle field="starred" label="Starred" />
</ActionBar>
```

---

## 3. Create a part with presets and a base component

Buttons are similar to filters, but the ActionBar also needs to support custom one-off buttons that don't fit a preset. This requires both presets *and* a base component for the open-ended case.

```typescript
// action_bar/button/part.ts
import { actionBar } from '../assembly';

export interface SaveButtonProps {
  onClick?: () => void;
}

export interface DeleteButtonProps {
  onClick?: () => void;
  confirmMessage?: string;
}

export interface ButtonPresets {
  save: SaveButtonProps;
  delete: DeleteButtonProps;
}

export const button = actionBar.definePart<ButtonPresets>({ name: 'button' });

// Base component for custom buttons -- uses `props.id` for identity.
export interface ButtonProps {
  id: string;
  label: string;
  color?: 'primary' | 'danger' | 'text';
  onClick?: () => void;
}

export const Button = button.createComponent<ButtonProps>();
```

```typescript
// action_bar/button/save.ts
import { button } from './part';

export { type SaveButtonProps } from './part';

export const SaveButton = button.createPreset({ name: 'save' });
```

```typescript
// action_bar/button/index.ts
export { Button, type ButtonProps } from './part';
export { SaveButton, type SaveButtonProps } from './save';
export { DeleteButton, type DeleteButtonProps } from './delete';
```

Consumer usage:

```tsx
const { Button } = ActionBar;

<ActionBar>
  <Button.Save onClick={handleSave} />
  <Button.Delete onClick={handleDelete} />
  <Button id="export" label="Export" onClick={handleExport} />
</ActionBar>
```

### Instance IDs

The same preset can appear multiple times. Without an explicit `id` prop, IDs are auto-generated:

```tsx
<Button.Save onClick={onSave} />          {/* instanceId: 'save' */}
<Button.Save onClick={onSaveAs} />        {/* instanceId: 'save-1' */}
```

With an explicit `id`, the consumer controls identity:

```tsx
<Button.Save id="save-draft" onClick={onDraft} />     {/* instanceId: 'save-draft' */}
<Button.Save id="save-publish" onClick={onPublish} />  {/* instanceId: 'save-publish' */}
```

---

## 4. Build a compound component namespace

With parts and presets defined, wire them together so consumers can use the `ActionBar.Button.Save` dot-access pattern. Use `Object.assign` to attach presets to a base component.

```typescript
import { Button, SaveButton, DeleteButton } from './button';

export const ActionBarButton = Object.assign(Button, {
  Save: SaveButton,
  Delete: DeleteButton,
});
```

Repeat for other parts, then assemble at the top level:

```typescript
import { Spacer } from './spacer';

export const ActionBar = Object.assign(ActionBarComponent, {
  Button: ActionBarButton,
  Filter: ActionBarFilter,
  Spacer,
});
```

---

## 5. Parse children and filter by part

The assembly component needs to read its children to know what was declared. Parsing walks the React children tree, identifies declarative components by their static Symbol properties, and returns a flat array in source order. Each item describes one declared part or one passthrough child.

### What parsing produces

Every parsed part is a `ParsedPart` object with five fields:

```typescript
interface ParsedPart {
  /** Discriminator -- always `'part'`. */
  type: 'part';
  /** Which part type this belongs to (e.g., `'button'`, `'filter'`). */
  part: string;
  /** The preset name, or `undefined` for custom (non-preset) parts. */
  preset?: string;
  /** Unique identity resolved from `props.id`, the preset name, or auto-generated. */
  instanceId: string;
  /** The declared props, passed through as-is from JSX. */
  attributes: Record<string, unknown>;
}
```

Non-declarative children (plain elements, strings, numbers) become `ParsedChild` objects with `type: 'child'` and a `node` field holding the original React node.

Given this JSX:

```tsx
<ActionBar>
  <Button.Save onClick={handleSave} />
  <Button.Delete onClick={handleDelete} />
  <Button id="export" label="Export" onClick={handleExport} />
</ActionBar>
```

Parsing produces three `ParsedPart` items:

| `part` | `preset` | `instanceId` | `attributes` |
|--------|----------|--------------|--------------|
| `'button'` | `'save'` | `'save'` | `{ onClick: handleSave }` |
| `'button'` | `'delete'` | `'delete'` | `{ onClick: handleDelete }` |
| `'button'` | `undefined` | `'export'` | `{ id: 'export', label: 'Export', onClick: handleExport }` |

The third row has no `preset` because it uses the base `Button` component created via `createComponent`, not a preset. Its `instanceId` comes from the explicit `id` prop.

### Two entry points

There are two ways to parse, depending on whether you need all part types or just one.

**`part.parseChildren(children)`** -- parses and filters to a single part type in one step. Returns `ParsedPart[]`. Preferred for hooks that only care about one part.

```typescript
import { button } from './button/part';

const useButtons = (children: ReactNode) => {
  const parts = button.parseChildren(children);
  return parts.map(({ instanceId, attributes }) => ({ instanceId, attributes }));
};
```

**`assembly.parseChildren(children)`** -- parses all part types in one pass. Returns `ParsedItem[]` (union of `ParsedPart | ParsedChild`), preserving interleaved order. Use when the order between different part types matters.

```typescript
import { actionBar } from './assembly';

const ActionBarComponent: FC<{ children?: ReactNode }> = ({ children }) => {
  const items = actionBar.parseChildren(children);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      {items.map((item, i) => {
        if (item.type === 'child') return item.node;
        if (item.part === 'spacer') {
          return <EuiFlexItem key={i} grow={true} />;
        }
        return (
          <EuiFlexItem key={item.instanceId} grow={false}>
            {renderPart(item)}
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
```

### Providing defaults

When no matching parts are found, fall back to a hardcoded default. Build the fallback as a `ParsedPart` literal so it flows through the same resolution path.

```typescript
const DEFAULT_PARTS: ParsedPart[] = [
  { type: 'part', part: 'button', preset: 'save', instanceId: 'save', attributes: {} },
];

const parseButtons = (children: ReactNode): ParsedPart[] => {
  if (children === undefined) return DEFAULT_PARTS;

  const parts = button.parseChildren(children);
  return parts.length > 0 ? parts : DEFAULT_PARTS;
};
```

---

## 6. Render passthrough React node children

Recipe 5 showed that `assembly.parseChildren()` returns `ParsedChild` items (`{ type: 'child', node }`) for non-part children. The renderer decides what to do with them: render them in place, reposition them, or ignore them.

This recipe shows a complete `ActionBar` that renders arbitrary React nodes alongside its button parts, in source order.

### Renderer implementation

Use `assembly.parseChildren()` (not `part.parseChildren()`) to get the full interleaved result. Pass `{ supportsOtherChildren: true }` to suppress the dev-mode warning for unrecognized function components, since this renderer intentionally supports them.

```tsx
// action_bar/action_bar.tsx
import type { FC, ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { actionBar } from './assembly';
import { button } from './button/part';

interface ActionBarProps {
  children?: ReactNode;
}

const ActionBarComponent: FC<ActionBarProps> = ({ children }) => {
  const items = actionBar.parseChildren(children, { supportsOtherChildren: true });

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      {items.map((item, i) => {
        // Render non-part children in their source-order position.
        if (item.type === 'child') {
          return <EuiFlexItem key={`child-${i}`} grow={false}>{item.node}</EuiFlexItem>;
        }

        // Resolve and render button parts.
        const rendered = button.resolve(item);
        if (!rendered) return null;

        return (
          <EuiFlexItem key={item.instanceId} grow={false}>
            {rendered}
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
```

### Consumer usage

Regular React elements mix freely with declarative parts. JSX order determines render order.

```tsx
import { EuiText } from '@elastic/eui';

const { Button } = ActionBar;

<ActionBar>
  <Button.Save onClick={handleSave} />
  <EuiText size="s" color="subdued">Changes will be published immediately.</EuiText>
  <Button.Delete onClick={handleDelete} />
</ActionBar>
```

The `<EuiText>` renders between the two buttons, exactly where it appears in JSX.

---

## 7. Resolve presets with `resolve`

With `resolve`, each preset's transformation logic is co-located with its definition. The assembly dispatches automatically -- no manual `Record` map or casts needed in consumer code. Register a `resolve` callback on `createComponent` to handle custom parts too.

```tsx
import { EuiButton } from '@elastic/eui';
import { actionBar } from '../assembly';

export const button = actionBar.definePart<ButtonPresets>({ name: 'button' });

// Each preset registers its own `resolve` callback -- no casts.
export const SaveButton = button.createPreset({
  name: 'save',
  resolve: ({ onClick }) => <EuiButton onClick={onClick}>Save</EuiButton>,
});

export const DeleteButton = button.createPreset({
  name: 'delete',
  resolve: ({ onClick }) => (
    <EuiButton color="danger" onClick={onClick}>Delete</EuiButton>
  ),
});

// Custom buttons also register a `resolve` callback via `createComponent`.
// This eliminates the manual cast of `attributes as ButtonProps`.
export const Button = button.createComponent<ButtonProps>({
  resolve: ({ label, color, onClick }) => (
    <EuiButton color={color} onClick={onClick}>{label}</EuiButton>
  ),
});

// In the component -- `button.resolve` dispatches to the right callback
// for both presets and custom parts. No fallback branch needed.
const parts = button.parseChildren(children);

for (const part of parts) {
  const rendered = button.resolve(part);
  if (rendered) render(rendered);
}
```

---

## 8. Resolve with runtime context

Recipe 7 shows `resolve` for the simple case: attributes in, JSX out. But when the output is a data structure (not JSX) and the builder needs runtime state from hooks -- like provider configuration or feature flags -- pass that state as `TContext`. The assembly component assembles context from hooks and hands it to `resolve` at call time.

**When to use context:**
- `TOutput` is a data structure (e.g., `EuiBasicTableColumn`), not `ReactNode`.
- Resolve callbacks need ambient state that consumers don't declare as props.

**When to skip it:**
- Output is `ReactNode` (the default). Resolve callbacks usually produce JSX from attributes alone.
- Only one preset needs extra state. Consider manual dispatch instead.

### Define the context type

A small interface describing the runtime state all resolvers share.

```typescript
// column/types.ts
export interface ColumnContext {
  /** Whether sorting is available from the provider. */
  supports?: { sorting?: boolean };
  /** Entity name for display in column headers. */
  entityName?: string;
}
```

### Wire it into `definePart`

Specify all three generics: preset map, output type, and context type.

```typescript
// column/part.ts
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import { table } from '../assembly';
import type { ColumnContext } from './types';

interface ColumnPresets {
  name: NameColumnProps;
}

export const column = table.definePart<
  ColumnPresets,
  EuiBasicTableColumn<ContentListItem>,
  ColumnContext
>({ name: 'column' });
```

### Register a resolve callback that uses context

The second parameter in the callback is the context type you declared. TypeScript enforces the shape.

```typescript
// column/name/name_builder.tsx
export const NameColumn = column.createPreset({
  name: 'name',
  resolve: (attributes, context) => ({
    field: 'title',
    name: attributes.columnTitle ?? 'Name',
    sortable: (context.supports?.sorting ?? true)
      ? (attributes.sortable ?? true)
      : false,
  }),
});
```

### Assemble context from hooks and resolve

The hook gathers provider state into a `ColumnContext`, then passes it to `column.resolve`. With `createComponent({ resolve })` registered for custom columns, a single `column.resolve` call handles both presets and custom parts.

```typescript
// hooks/use_columns.ts
export const useColumns = (children: ReactNode) => {
  const { supports, labels } = useContentListConfig();

  return useMemo(() => {
    const context: ColumnContext = { supports, entityName: labels.entity };
    const parts = column.parseChildren(children);

    return parts.map((part) => column.resolve(part, context)!);
  }, [children, supports, labels.entity]);
};
```

When `TContext` is `void` (the default), `resolve` requires no second argument.

---

## 9. Tag an existing component with `tagComponent`

Use `tagComponent` when a component is **defined in another module** and you need to add assembly metadata to it. This is common when a declarative component is shared across multiple assemblies -- each assembly tags the same component with its own symbol, and the symbols don't collide because they're keyed by assembly name.

```typescript
// @kbn/shared-filters/sort.ts -- defined once, used by multiple assemblies.
import type { DeclarativeReturn } from '@kbn/content-list-assembly';

export interface SortProps {
  field: string;
  direction?: 'asc' | 'desc';
}

export const Sort = (_props: SortProps): DeclarativeReturn => null;
```

```typescript
// toolbar/filter/part.ts -- tag for the toolbar assembly.
import { toolbar } from '../assembly';
import { Sort } from '@kbn/shared-filters';

const filter = toolbar.definePart({ name: 'filter' });
filter.tagComponent(Sort);
```

```typescript
// table/header/part.ts -- tag the same component for a different assembly.
import { table } from '../assembly';
import { Sort } from '@kbn/shared-filters';

const header = table.definePart({ name: 'header' });
header.tagComponent(Sort);
```

Each assembly writes its own symbol key (`kbn.Toolbar.part`, `kbn.Table.part`), so they coexist on the same component without conflict.

> **Tip:** If the component is defined in the same module and isn't shared,
> `createComponent<SortProps>()` is simpler and produces the same result.

---

## 10. Test declarative components

Verify that declarative components parse correctly, generate the right instance IDs, and carry the expected attributes. Test three things: identification, parsing, and resolution.

```typescript
import React from 'react';
import { actionBar } from './assembly';
import { SaveButton } from './button';

describe('SaveButton', () => {
  it('parses with the correct preset and attributes.', () => {
    const onClick = jest.fn();
    const children = <SaveButton onClick={onClick} />;

    const items = actionBar.parseChildren(children);
    const parts = items.filter((item) => item.type === 'part');

    expect(parts).toHaveLength(1);
    expect(parts[0]).toEqual(
      expect.objectContaining({
        preset: 'save',
        instanceId: 'save',
        attributes: expect.objectContaining({ onClick }),
      })
    );
  });

  it('auto-generates instance IDs for repeated presets.', () => {
    const children = (
      <>
        <SaveButton onClick={jest.fn()} />
        <SaveButton onClick={jest.fn()} />
      </>
    );

    const items = actionBar.parseChildren(children);
    const parts = items.filter((item) => item.type === 'part');
    const ids = parts.map((p) => {
      if (p.type !== 'part') throw new Error('unreachable');
      return p.instanceId;
    });

    expect(ids).toEqual(['save', 'save-1']);
  });

  it('supports explicit IDs.', () => {
    const children = (
      <>
        <SaveButton id="save-draft" onClick={jest.fn()} />
        <SaveButton id="save-publish" onClick={jest.fn()} />
      </>
    );

    const items = actionBar.parseChildren(children);
    const parts = items.filter((item) => item.type === 'part');
    const ids = parts.map((p) => {
      if (p.type !== 'part') throw new Error('unreachable');
      return p.instanceId;
    });

    expect(ids).toEqual(['save-draft', 'save-publish']);
  });
});
```
