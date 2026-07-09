---
navigation_title: Assembly
description: The Assembly pattern for declarative React APIs, its key terms, and when to reach for it instead of plain props.
---

# Assembly pattern overview

Assembly is a small pattern for building declarative React APIs. A parent component parses typed, non-rendering child components and resolves them into the UI or data structures it needs.

Instead of passing large arrays of configuration:

```tsx
<Toolbar filters={['tags', 'sort']} />
```

Consumers write JSX that mirrors the result:

```tsx
<Toolbar>
  <Filters>
    <Filters.Tags />
    <Filters.Sort />
  </Filters>
</Toolbar>
```

## Key terms

| Term | Meaning |
|---|---|
| Assembly | The parent API that owns and parses children. |
| Part | A category of declarative child, such as `Column`, `Action`, or `Filter`. |
| Preset | A named variant of a part, such as `Column.Name` or `Action.Delete`. |
| Resolve | The step that turns parsed attributes into renderable output. |

## When to use Assembly

Use Assembly when a component has many optional features, order matters, and the consumer should be able to compose the API visually.

Do not use Assembly for a component with a few fixed options. Plain props are easier to read and maintain in those cases.

For API-level reference and worked recipes, see the `README.md` and `RECIPES.md` in `@kbn/content-list-assembly`; these guides are the conceptual tour.

## Basic example

:::{storybook}
:id: kibana:content_management:assembly-examples--basic-action-bar
:::

:::{literalinclude} ../../examples/assembly/basic_action_bar.example.tsx
:language: tsx
:::

