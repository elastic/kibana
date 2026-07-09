---
navigation_title: Getting started
description: Build a small ActionBar assembly step by step, from defining the assembly through parsing and resolving its declarative children.
---

# Getting started with Assembly

This walkthrough builds a small `ActionBar` API. The child components return `null`; their props become typed configuration that the parent resolves into buttons.

## Step 1: define an assembly

```ts
const actionBar = defineAssembly({ name: 'ActionBar' });
```

The assembly name becomes part of the runtime identity used to recognize its declarative children.

## Step 2: define a part

Parts group related declarative children. A part can have preset variants and custom instances.

:::{storybook}
:id: kibana:content_management:assembly-examples--part
:::

:::{literalinclude} ../../examples/assembly/part.example.tsx
:language: tsx
:::

## Step 3: add presets

Presets give common variants a small, discoverable API.

:::{storybook}
:id: kibana:content_management:assembly-examples--preset
:::

:::{literalinclude} ../../examples/assembly/preset.example.tsx
:language: tsx
:::

## Step 4: expose a namespace

Most consumers should import one parent and use namespaced children from it, such as `Action.Save` and `Action.Delete`.

:::{storybook}
:id: kibana:content_management:assembly-examples--namespace
:::

:::{literalinclude} ../../examples/assembly/namespace.example.tsx
:language: tsx
:::

## Step 5: parse and resolve

Parsing extracts source-ordered configuration. Resolving turns each parsed part into concrete output.

:::{storybook}
:id: kibana:content_management:assembly-examples--parsing
:::

:::{literalinclude} ../../examples/assembly/parsing.example.tsx
:language: tsx
:::

:::{storybook}
:id: kibana:content_management:assembly-examples--resolving
:::

:::{literalinclude} ../../examples/assembly/resolving.example.tsx
:language: tsx
:::

