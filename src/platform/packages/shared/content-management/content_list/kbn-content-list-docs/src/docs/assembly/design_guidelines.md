---
navigation_title: Design guidelines
description: Principles for designing Assembly APIs, including visible order, domain-specific names, context for runtime state, and escape hatches.
---

# Assembly design guidelines

Assembly APIs should make complex composition feel obvious. The JSX should read like the UI structure the consumer wants, and the parent component should own the rendering details.

## Prefer visible order

If order matters in the UI, order should be visible in JSX. This is the strongest reason to use Assembly.

:::{storybook}
:id: kibana:content_management:assembly-examples--basic-action-bar
:::

:::{literalinclude} ../../examples/assembly/basic_action_bar.example.tsx
:language: tsx
:::

## Keep names domain-specific

Use nouns for parts and specific labels for presets. `Column.Name`, `Column.UpdatedAt`, `Action.Delete`, and `Filters.Tags` are easier to scan than generic names such as `Item` or `Option`.

:::{storybook}
:id: kibana:content_management:assembly-examples--namespace
:::

:::{literalinclude} ../../examples/assembly/namespace.example.tsx
:language: tsx
:::

## Use context for runtime state

Declarative props describe what the consumer wants. Runtime state belongs in resolve context: read-only mode, feature support, provider services, locale, loading state, or user permissions.

:::{storybook}
:id: kibana:content_management:assembly-examples--context
:::

:::{literalinclude} ../../examples/assembly/context.example.tsx
:language: tsx
:::

## Preserve escape hatches

Provide a base part component for custom instances when presets cannot cover every consumer need.

:::{storybook}
:id: kibana:content_management:assembly-examples--part
:::

:::{literalinclude} ../../examples/assembly/part.example.tsx
:language: tsx
:::

## Avoid fragile wrappers

Declarative components are identified through static Symbol properties. Avoid wrapping them with `React.memo`, `forwardRef`, or higher-order components unless the static metadata is preserved.

