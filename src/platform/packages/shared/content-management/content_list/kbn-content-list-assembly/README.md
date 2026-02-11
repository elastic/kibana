# @kbn/content-list-assembly

Typed factory for building **declarative component** APIs in React. This package provides the shared infrastructure that allows parent components ("assemblies") to discover, identify, and extract configuration from declarative components placed as JSX children.

## Documentation

- [GETTING_STARTED.md](GETTING_STARTED.md) -- New to the assembly pattern? Start here for a conceptual introduction, key terms, and step-by-step walkthroughs.
- [RECIPES.md](RECIPES.md) -- Common patterns and copy-paste examples.

## Why this pattern?

Traditional React component APIs accept configuration as props -- objects, arrays, render functions. This works well for simple cases, but becomes unwieldy when a component has many optional, composable features that users want to arrange in a specific order:

```tsx
// Prop-based: hard to read, rigid ordering, no visual hierarchy.
<ContentListTable
  columns={['name', 'updatedAt', 'actions']}
  actions={['edit', 'delete']}
  nameColumnWidth="300px"
  actionsColumnWidth="100px"
/>
```

The declarative component pattern replaces this with JSX children that **look like** the UI they configure:

```tsx
// Declarative: readable, composable, order is visual.
<ContentListTable>
  <Column.Name width="300px" />
  <Column.UpdatedAt />
  <Column id="actions" name="Actions" width="100px" render={renderActions} />
</ContentListTable>
```

**JSX order is rendering order.** Consumers declare parts in the order they want them rendered. The parse result preserves that order exactly, including any non-part children interleaved.

## Three-layer mental model

Every assembly follows three named layers. TypeScript constrains each layer.

```
Assembly -> Part -> Preset
```

| Layer | What it is | Example |
|-------|-----------|---------|
| **Assembly** | A named parent component that parses its children for configuration. | `defineAssembly({ name: 'ContentListTable' })` |
| **Part** | A category of declarative component within an assembly. Typed with a preset-to-props mapping. | `table.definePart<ColumnPresets>({ name: 'column' })` |
| **Preset** | A named variant for a part. Props type is inferred from the mapping. | `column.createPreset({ name: 'name' })` |

### Identification

Declarative components are identified via **static Symbol properties** on the component function, not by `displayName` or `function.name` (which are unsafe under minification). The flow for each child element is:

```
child element
  |
  ├─ Is it a React element?
  |    no → passthrough as { type: 'child', node }
  |
  ├─ Is it a Fragment?
  |    yes → unwrap and recurse into fragment children
  |
  ├─ Does element.type[Symbol.for('kbn.{assembly}.part')] match?
  |    no → passthrough as { type: 'child', node }
  |
  ├─ Resolve instanceId:
  |    1. props.id is a string? → use it (duplicate explicit IDs warn and drop)
  |    2. static preset exists and not yet seen? → use preset
  |    3. otherwise → auto-generate from preset or part name
  |
  └─ Use props as attributes
       → push { type: 'part', part, preset, instanceId, attributes }
```

## Exports

### `defineAssembly(config)`

Primary API. Creates a typed assembly factory.

```typescript
import { defineAssembly } from '@kbn/content-list-assembly';

const table = defineAssembly({ name: 'ContentListTable' });
// table.name === 'ContentListTable' (literal type preserved).
```

Returns an `AssemblyFactory<TName>` with the following methods:

#### `assembly.definePart<TPresetMap, TOutput, TContext>(partDefinition)`

Defines a part type within the assembly. `TPresetMap` is a mapping of preset names to their props types. `TOutput` is the return type of `resolve` (defaults to `ReactNode`). `TContext` is an optional context type passed to `resolve` (defaults to `void`). Returns a `PartFactory<TPresetMap, TOutput, TContext>`.

```typescript
interface ColumnPresets {
  name: NameColumnProps;
  updatedAt: UpdatedAtColumnProps;
}

const column = table.definePart<ColumnPresets>({ name: 'column' });
```

#### `assembly.parseChildren(children)`

Parses all part types in this assembly from React children. Returns `ParsedItem[]` -- a flat array in source order. All part types are matched in a single pass. Filter by `item.part` to scope to a specific part type.

```typescript
const items = table.parseChildren(children);

// All items, in source order:
for (const item of items) {
  if (item.type === 'part') {
    console.log(item.part, item.preset, item.instanceId, item.attributes);
  }
}

// Filter to a specific part type:
const columns = items.filter((item) => item.type === 'part' && item.part === 'column');
```

#### `part.createPreset(definition)`

Creates a preset component. The props type is automatically inferred from the mapping provided to `definePart`. Optionally provide a `resolve` callback to convert declared attributes into concrete output.

```typescript
// Props type inferred as NameColumnProps from the ColumnPresets mapping.
const NameColumn = column.createPreset({
  name: 'name',
  resolve: (attributes, context) => buildNameColumn(attributes, context),
});
```

#### `part.resolve(part, context?)`

Resolves a parsed part by dispatching to the `resolve` callback registered via `createPreset` or `createComponent`. Checks preset resolvers first; falls back to the component resolver if no preset matches. Returns `undefined` if no resolver handles the part.

```typescript
const resolved = column.resolve(parsedPart, context);
```

#### `part.parseChildren(children)`

Parses React children and filters to this part type only. Equivalent to calling `assembly.parseChildren(children)` and filtering to matching parts, but avoids the manual filter boilerplate.

```typescript
// Instead of:
const items = table.parseChildren(children);
const columns = items.filter((item) => item.type === 'part' && item.part === 'column');

// Use:
const columns = column.parseChildren(children);
```

#### `part.createComponent<P>(options?)`

Creates a component without a preset (e.g., custom columns). Use for parts that get their identity from `props.id`. Optionally provide a `resolve` callback as a fallback for non-preset parts in `part.resolve()`.

```typescript
// Without resolver:
const FiltersComponent = filtersPart.createComponent<FiltersProps>();

// With resolver (absorbs the attributes cast internally):
const Column = column.createComponent<ColumnProps>({
  resolve: (attributes, context) => buildCustomColumn(attributes, context),
});
```

#### `part.tagComponent(component, options?)`

Tags an existing component with assembly metadata. Use when the component is already defined elsewhere.

```typescript
import type { DeclarativeReturn } from '@kbn/content-list-assembly';

const Spacer = (_props: SpacerProps): DeclarativeReturn => null;

spacerPart.tagComponent(Spacer);
```

### `ParsedPart`

A parsed declarative part with `type`, `part`, `preset`, `instanceId`, and `attributes` fields.

### `ParsedChild`

A non-part child from the React tree with `type: 'child'` and `node`.

### `ParsedItem`

Union of `ParsedPart | ParsedChild`. Use the `type` field to discriminate.

### `DeclarativeComponent<P>`

Function type for a non-generic declarative component. Shorthand for `(props: P) => null`.

```typescript
import type { DeclarativeComponent } from '@kbn/content-list-assembly';

const MyControl: DeclarativeComponent<ControlProps> = (_props) => null;
```

### `DeclarativeReturn`

Type alias for `null`. Use as the return type when hand-writing a declarative component signature. Prefer `DeclarativeComponent<P>` when possible.

```typescript
import type { DeclarativeReturn } from '@kbn/content-list-assembly';

const Spacer = (_props: SpacerProps): DeclarativeReturn => null;
```

## Design decisions

### Why `Symbol.for()` instead of string keys?

`Symbol.for()` creates globally registered symbols that are identical across module boundaries -- even if two different versions of `@kbn/content-list-assembly` are loaded. This avoids the pitfalls of `instanceof` checks (which fail across bundles) and plain string property names (which risk collisions with user props).

### Why components that return `null`?

Declarative components are **configuration carriers**, not renderers. They never appear in the DOM. Props serve as a typed configuration schema, and the assembly has full control over rendering.

### Why no parser?

Props ARE the attributes. The assembly reads `child.props` directly. Transformation from declared attributes to concrete output is handled by `resolve` callbacks registered on each preset. This eliminates an entire layer of complexity with no loss of functionality.

### Why a preset-to-props mapping?

The mapping type (`definePart<{ name: NameColumnProps }>`) gives full type narrowing at definition time. TypeScript constrains which preset names can be used with `createPreset` and ensures the props type matches the mapping.

### Why parse at the assembly level?

The assembly owns its children. `assembly.parseChildren(children)` matches all part types in a single pass and returns them in source order. When consumers only need a single part type, `part.parseChildren(children)` is a convenience that parses and filters in one step. Both produce the same result; the choice depends on whether you need cross-part interleaving or a scoped list.

### Wrapping caveats

Do **not** wrap declarative components with `React.memo()`, `forwardRef()`, or HOCs without hoisting static properties. The identification strategy depends on statics being accessible on `element.type`.

## Testing

```bash
yarn test:jest src/platform/packages/shared/content-management/content_list/kbn-content-list-assembly
```
