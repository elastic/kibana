---
navigation_title: Recipes
description: Copyable Assembly recipes for building parts, presets, namespaces, and resolvers, including context and external component tagging.
---

# Assembly recipes

Use these recipes when building or extending a declarative component API.

## Build a basic assembly

:::{storybook}
:id: kibana:content_management:assembly-examples--basic-action-bar
:::

:::{literalinclude} ../../examples/assembly/basic_action_bar.example.tsx
:language: tsx
:::

## Add a custom part instance

Use a base part component when consumers need custom instances that do not deserve shared presets.

:::{storybook}
:id: kibana:content_management:assembly-examples--part
:::

:::{literalinclude} ../../examples/assembly/part.example.tsx
:language: tsx
:::

## Add preset variants

Use presets for common, stable variants that should be discoverable in autocomplete.

:::{storybook}
:id: kibana:content_management:assembly-examples--preset
:::

:::{literalinclude} ../../examples/assembly/preset.example.tsx
:language: tsx
:::

## Build a compound namespace

Expose the base component and presets from one namespace so the consumer API stays compact.

:::{storybook}
:id: kibana:content_management:assembly-examples--namespace
:::

:::{literalinclude} ../../examples/assembly/namespace.example.tsx
:language: tsx
:::

## Inspect parsed children

Use parsing tests and diagnostics to confirm JSX order, preset identity, instance IDs, and attributes.

:::{storybook}
:id: kibana:content_management:assembly-examples--parsing
:::

:::{literalinclude} ../../examples/assembly/parsing.example.tsx
:language: tsx
:::

## Resolve declarative children

Use `resolve` callbacks to convert declarative attributes into rendered elements or data structures.

:::{storybook}
:id: kibana:content_management:assembly-examples--resolving
:::

:::{literalinclude} ../../examples/assembly/resolving.example.tsx
:language: tsx
:::

## Resolve with context

Use context when the resolver needs runtime facts that should not be part of the declarative child props.

:::{storybook}
:id: kibana:content_management:assembly-examples--context
:::

:::{literalinclude} ../../examples/assembly/context.example.tsx
:language: tsx
:::

## Tag an external component

Use `part.tagComponent` when a component must be declared outside `createPreset`/`createComponent` (for example, it needs its own generic type parameter) but still needs Assembly identity.

:::{storybook}
:id: kibana:content_management:assembly-examples--external-tagging
:::

:::{literalinclude} ../../examples/assembly/external_tagging.example.tsx
:language: tsx
:::

