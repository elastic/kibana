---
navigation_title: Kibana UI
---

# Kibana UI (`@kbn/ui`)

Reusable, opinionated UI components for Kibana, built on top of [EUI](https://elastic.github.io/eui/) and `@elastic/eui`.

## What is Kibana UI?

EUI is Elastic's design language and component library — flexible, product-agnostic primitives shared across Kibana, Cloud UI, AutoOps, and internal apps. That agnosticism is the right choice for a shared library, but it means EUI intentionally stays out of Kibana-specific concerns like persistence, state management, and data fetching.

`@kbn/ui` is the layer above EUI where those concerns live. Think of EUI as atoms and molecules; `@kbn/ui` composes them into the molecules and organisms that define how Kibana's UI actually works: page templates, data tables with built-in persistence, search + filter patterns, empty states, and more. EUI remains the foundation — `@kbn/ui` extends it, it does not replace it.

## Why do we need it?

Kibana has no shared, canonical patterns for common UI flows. The same compositions — search + table, filter bars, empty states, persistent table settings, and more — are often rebuilt independently across plugins, with varying approaches and trade-offs. A recent UI audit surfaced 600+ UX issues stemming from this fragmentation.

EUI major upgrades compound the problem. Every plugin bound directly to EUI primitives absorbs its own share of breaking changes and visual regressions.

`@kbn/ui` is the missing default — a single set of building blocks that encode "the Kibana way."

- **Less code for the same outcome.** Common flows take fewer lines, freeing effort for feature-specific UX.
- **Accessibility baked in.** Focus management, keyboard navigation, and screen reader support are handled at the component level.
- **EUI upgrade insulation.** `@kbn/ui` absorbs EUI breaking changes and exposes a stable contract.
- **One place to evolve.** Global UX tweaks and visual refreshes roll out by updating the layer, not every plugin.

## Portability

Components here are designed to be **portable**. They work in Kibana today, but they can be extracted for use in Cloud UI or promoted up to EUI when a pattern proves valuable across all Elastic products.

To keep that door open, components are fully independent of Kibana. They don't import Kibana core, plugins, or packages that depend on them. Instead, they expose simple, generic interfaces — callbacks, event handlers, context providers — that consumers wire to whatever backing services they need. A component should work in Storybook or Cloud UI with zero Kibana knowledge; the Kibana-specific bridging happens in consuming code, not here.

```tsx
// Good: generic callback the consumer can wire to anything.
onSave: (data: Record<string, unknown>) => Promise<void>

// Bad: leaking a Kibana service type into the component.
savedObjectsClient: SavedObjectsClientContract
```

### Allowed dependencies

- `@elastic/eui`
- `@emotion/react`, `@emotion/css`
- `react`, `react-dom`
- `@kbn/i18n`

Additional exceptions _will_ exist, require review, and should be kept to an absolute minimum.

## Package structure

Each component lives in its own package under `src/platform/kbn-ui/`:

```
src/platform/kbn-ui/
├── <component_name>/
│   ├── kibana.jsonc
│   ├── tsconfig.json
│   ├── package.json
│   ├── index.ts
│   └── src/
└── README.md
```

Packages use the `@kbn/ui-<component>` naming convention and are owned by `@elastic/appex-sharedux`.

## Contributing

1. Create a new package directory under `src/platform/kbn-ui/`.
2. Add a `kibana.jsonc` with `"group": "platform"`, `"visibility": "shared"`, and the `@kbn/ui-<name>` id.
3. Export a single public API from `index.ts` — no subpath imports.
4. Include unit tests alongside source files.
5. Respect the dependency and portability rules above.

### Guidelines

- **Compose EUI, don't fork it.** Wrap and configure `@elastic/eui` components; avoid reimplementing what EUI already provides.
- **Opinionated defaults, escape hatches.** Encode "the Kibana way" by default, but allow overrides where necessary.
- **Mark portability intent.** If a component is a candidate for extraction to Cloud UI or promotion to EUI, note it in the package README.
